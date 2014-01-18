/** MathToTeX.js
* By Manish Goregaokar
* Licensing: CC-BY-SA (http://creativecommons.org/licenses/by-sa/3.0/)
* Also at https://github.com/Manishearth/manishearth.github.com/blob/master/MathToTex/MathToTeX.js
*/


//TODO: 
// add capabilities to recognise stuff like 1/sin(abc) or 1/sqrt(abc) and tokenize it correctly
// deal with 1/ab-->(1/a)b without breaking m_0^2/2 and 1/2/2/2


/**Generates final LaTeX from typed math
* This function is just there for convenience-- no need to create a TypedMath object, compile, and clean up.
* Use this when you just want the final LaTeX result and don't need to analyse the TypedMath object
*/
TypedMath.wholeShebang = function (text) {
    var TM = new TypedMath(text, false);
    TM.compile();
    return TypedMath.finalSweep(TM.compiledText);
}





/** TypedMath {class}
*
* #Constructor parameters
* @param text: {String} input text
* @param hasparen: {Boolean} Is this object enclosed in parentheses?
*
* #Member data
* originalText: {String} constituent input text, _after_ pre-cleanup
* eOriginalText: {String} untampered original text (for debugging purposes mainly)
* compiledText: {String} Holds result of compilation with placeholders. Empty before compilation.
* type: {TypedMath.types(technically integer)} Holds type of TM object, refers to "enum" TypedMath.types
* hasparen: {Boolean} Is this TM object enclosed by parentheses?
* multiline: {Boolean} Are  \left and \right required if this object/one of its parent objects is/are enclosed by parentheses?
* objects: {TypedMath[]} Holds the sub-tokens in the case of a "conglomerate" object (i.e. contains parenthesized statements). Populated by breakIntoParentheses()
* reqPN: {Mixed Array} Holds data about whether or not this needs the text of adjacent tokens to survive
*		reqPN[0]: {Boolean} Does it need the previous token?
*		reqPN[1]: {Boolean} Does it need the next token?
*		reqPN[2]: {String} (only if reqPN[0] or reqPN[1] is true)  Contains text of the token, with placeholders %p% and %n% which will 
*				be replaced with prev/next token during compilation. %{% and %}% denote braces which can be removed in the case of plain letters/digits.
*		reqPN[3]: {Boolean} (only if reqPN[0] or reqPN[1] is true) Are braces absolutely _necessary_ for it to work in TeX? 
*				For example, "a^b" is fine (no need to "a^{b}"), but "\sqrtb" is not--you have to do "\sqrt{b}".
*
* #Member functions
* void breakIntoParentheses(String text): Breaks into tokens based on (first-level) parentheses. Populates objects[] with these tokens, which are themselves TypedMath objects. Process recursively continues
* void propagateMultiline(void): Propagates the multiLine property from child to parent
* void compile(void): Assembles child objects into LaTeX string, stores in compiledText
*/

function TypedMath(text, hasparen) {
    //default stuff--will be overwritten at some point(hopefully)
    this.type = TypedMath.types.unknown;
    this.hasparen = hasparen;
    this.objects = [];
    this.reqPN = [false, false];
    this.compiledText = "";
    this.eOrigText = text;
    this.multiLine = false;

    this.originalText = TypedMath.preClean.run(text);	//Run the pre-cleanup to parenthesize ^,_,/, and sqrt.


    if (this.originalText.indexOf("(") != -1) { //if it is not a bottom-level token; i.e it still has parentheses, classify it as a conglomerate and break into parentheses.
        this.breakIntoParentheses();
        this.type = TypedMath.types.conglomerate;
        this.propagateMultiline();
    } else {
        switch (this.originalText) {
            case "/":
                this.type = TypedMath.types.fraction;
                this.reqPN = [true, true, "\\frac{%p%}{%n%}", true]; //fractions need both previous and next tokens. reqPN[3] is true since \fracab does not work--\frac{a}{b} is required
                this.multiLine = true; //fractions are obviously multiline
                this.hasparen = false; /*if the typed fraction has parentheses (which are usually needed to get rid of ambiguity in typed fractions--like "1+(1/2)+x"),
									remove the parentheses. LaTeX fracs are perfectly clear without parentheses. If you still want the parens, add an extra set
				*/
                break;
            case "_":
                this.type = TypedMath.types.subscr;
                this.reqPN = [false, true, "_%{%%n%%}%", false]; // needs the following token, not the preceding one. Also, a^b is fine in TeX, no need to explicitly specify the
                this.hasparen = false; //reset the hasparen (see frac above)
                //no multiline, (A_B) and \left(A_B\right) have no visible difference
                break;
            case "^":
                this.type = TypedMath.types.supscr;
                this.reqPN = [false, true, "^%{%%n%%}%", false]; //ditto as supscr
                this.multiLine = true; //(A^B) and \left(A^B\right) are different
                this.hasparen = false; //reset hasparen
                break;
            case "sqrt":
                this.type = TypedMath.types.sqrt;
                this.reqPN = [false, true, "\\sqrt%{%%n%%}%", true]; //needs following token. Also needs braces in all cases (except digits).
                this.multiLine = true;
                this.hasparen = false;
                break;

            default:
                this.type = TypedMath.types.plaintext; //a plain "text" token, lowest level. 
        }

    }

}



TypedMath.collectN = true; // for sqrts and sub/supscripts, all alphanumeric characters till a space are collected. So 1/ab-->1/(ab)


/** TypedMath.types
* Enum-sort of thing for classifying the "type" of an object.
*/
TypedMath.types = {
    "unknown": 0,
    "plaintext": 1,
    "conglomerate": 2,
    "fraction": 3,
    "subscr": 4,
    "supscr": 5,
    "sqrt": 6,
};




/**
* splits TypedMath object into parentheses-delimited tokens. These tokens populate the objects[] array.
* For example, "aa(bb)cc(dde/f)g(hi(jk)l)" will be split into "[aa,bb,cc,dd/ef,hi(jk)l]", which is recursively split into "[aa,bb,cc,dd/ef,[hi,jk,l]]"
* Since certain tokens (like "cc" in the above example) become their own token due to their misfortune of being sandwiched between paranthesized tokens, we have the hasparen
* property, which denotes whether or not the token had parentheses initially
*/
TypedMath.prototype.breakIntoParentheses = function () {
    var i = 0;
    var curstr = ""; //the current string being built
    var parencount = 0; //denotes the level of parentheses. Since this function is recusrively called, it only needs to token-ify the text into top-level parenthesized tokens
    var hparen = false;  //hasparen flag
    for (i = 0; i < this.originalText.length; i++) {

        if (this.originalText.charAt(i) == "(") {
            parencount++; //if opening parentheses, increase the leven of parens
            if (parencount != 1) {
                curstr += "(";	//if we're somewhere inside (not toplevel), then just append the 
            } else { //if we have just exited top-level parentheses, then we ought to push the current content into the objects array. Eg, for "abc(def)"--abc needs to be pushed
                if (curstr != "") { //only if it's not empty. No need to do anything in a case like "(abc)(xyz)"
                    this.objects.push(new TypedMath(curstr, hparen));
                }
                curstr = "";
                hparen = true;
            }
        } else if (this.originalText.charAt(i) == ")") {
            parencount--;
            if (parencount == 0) { //if we're back at top-level parentheses
                hparen = false; //reset
                this.objects.push(new TypedMath(curstr, true));
                curstr = "";
            } else {
                curstr += ")";	//if we're not at toplevel, just add the parenthesis to the string.. Recursion will deal with these
            }
        } else {
            curstr += this.originalText.charAt(i);	//if not a parenthesis, then just append it to the current string

        }

    }
    if (this.objects.length == 0) { //if this was empty for any reason, leave it empty.
        return this.objects;
    }
    if (curstr != "") {
        this.objects.push(new TypedMath(curstr, false)); // will take care of the last remaining token. Ex in "a(b)c", the "c" will be pushed.
    }
    return this.objects;
}




/** Compiler function
* Converts TypedMath object into LaTeX recursively
* 
* 
*/


TypedMath.prototype.compile = function () {
    this.compiledText = ""; //Reset compiledText, there are legitimate uses where we may want to recompile, and without resetting this we may end up appending the new compiled text to the old one.
    if (this.type == TypedMath.types.conglomerate) {
        for (var i = 0; i < this.objects.length; i++) {

            this.objects[i].compile(); //Compile all subobjects first.
        }
        var Cobjs = []; //Array of compiled objects. A different array is necessary since we may have to do some extra pushing and popping in the case of fractions/etc
        for (var i = 0; i < this.objects.length; i++) {
            var o = this.objects[i];
            var P = o.reqPN[0];
            var N = o.reqPN[1];
            if (P == false && N == false) { //if the token is a normal token with no requirements for previous and next objects, just push it
                Cobjs.push(o);
            } else if (P == true && N == true) { //for fractions, etc
                var pO = [Cobjs.pop(), this.objects[i + 1]]; //get previous and next token. Note that the prev token is pop()-ed fromCobjs, so it is no longer there
                var CT = o.compiledText; //shortcut
                if (this.objects.length == i + 1) {
                    //this catches strange cases when the user has not entered a token after the fraction. Eg "ab(cd/)ef". It then defers the addition of the next token
                    //to the containing conglomerate token
                    pO[0].hasparen = false; //reset parentheses, we don't need them if it's in a fraction
                    pO[0].compile(); //recompile since we changed the parentheses
                    CT = CT.replace("%p%", pO[0].compiledText); //replace the %p% "previous" placeholder
                    o.compiledText = CT;
                    Cobjs.push(o);
                    this.reqPN = [false, true, CT, o.reqPN[3]]; //defer to parent token

                } else {
                    pO[0].hasparen = false; //reset parentheses and recompile, fractions/etc do not need parentheses
                    pO[1].hasparen = false;
                    pO[0].compile();
                    pO[1].compile();
                    CT = CT.replace("%p%", pO[0].compiledText); //replace previous/next placeholders
                    CT = CT.replace("%n%", pO[1].compiledText);
                    o.compiledText = CT;
                    Cobjs.push(o);
                    i++; //artificially increment, since we "absorbed" an extra token
                }
            } else if (P == false) { //superscripts,subscripts,square roots
                var CT = o.compiledText;
                if (this.objects.length == i + 1) {
                    Cobjs.push(o);
                    this.reqPN = [false, true, "", o.reqPN[3]]; //defer
                } else {
                    this.objects[i + 1].hasparen = false; //reset and recompile to remove parentheses
                    this.objects[i + 1].compile();
                    var CT1 = this.objects[i + 1].compiledText; //shortcut
                    if (CT1.search(/[A-Za-z0-9]/) == 0) { //if it starts with letters or digits, then put the letters/digits(as many as possible) into the su(p|b)script 
                        //and keep the rest outside. This means that "a^xyz" displays as "a^(xyz)", but "a^xy z" displays "a^(xy) z"
                        var subscr;

                        if (TypedMath.collectN) {
                            subscr = CT1.match(/[A-Za-z0-9]+/)[0];//the sub/sup script
                            CT1 = CT1.replace(/[A-Za-z0-9]+/, ""); //we've extracted it, now remove it from the string  ('+' modifier for all chars)
                        } else {
                            subscr = CT1.match(/[A-Za-z0-9]/)[0];//the sub/sup script
                            CT1 = CT1.replace(/[A-Za-z0-9]/, ""); //we've extracted it, now remove it from the string (first char only, no +)

                        }
                        CT = CT.replace("%n%", subscr); //replace placeholder with su(p|b)script
                        CT = CT.replace(/%([\{\}])%/ig, (subscr.length == 1 && (!o.reqPN[3] || subscr.match(/\d/))) ? "" : "$1"); //if the su(p|b)script/sqrt is only a character long, and the thingy can accept characters without needing braces OR the character is a digit ("\sqrt2" works), then remove the braces for neatness
                        CT += CT1;
                    } else {
                        if (this.objects[i + 1].compiledText.charAt(0) == " ") { //the square root pre clean adds some spaces which may be removed now
                            this.objects[i + 1].compiledText = this.objects[i + 1].compiledText.slice(1);
                        }
                        CT = CT.replace("%n%", this.objects[i + 1].compiledText);
                        CT = CT.replace(/%([\{\}])%/ig, (this.objects[i + 1].compiledText.length == 1 && (!o.reqPN[3] || subscr.match(/\d/))) ? "" : "$1"); //remove braces for neatness wherever possible

                    }
                    o.compiledText = CT;
                    Cobjs.push(o);
                    i++;	//artificial increment
                }
            } else { //currently no use, haven't added any operators that require only the previous token to work. Good to have bare-bones functionality, though.
                var CT = o.compiledText;
                var popO = Cobjs.pop();
                CT = CT.replace("%p%", popO.compiledText);
                CT = CT.replace(/%([\{\}])%/ig, (popO.compiledText.length == 1) ? "" : "$1");
                o.compiledText = CT;
                Cobjs.push(o);
            }



        }
        for (var i = 0; i < Cobjs.length; i++) {
            this.compiledText += Cobjs[i].compiledText; //assemble
        }
        if (this.hasparen) { //if this was enclosed with parentheses
            if (this.multiLine) {
                this.compiledText = "\\left(" + this.compiledText + "\\right)"; //if there are some multiline tokens anywhere inside, use LaTeX \left\right
            } else {
                this.compiledText = "(" + this.compiledText + ")"; //don't use \left\right for neatness if not required					
            }
        }
        return;
    }
    if (this.type == TypedMath.types.plaintext) {//deal with plaintext bottom-level tokens
        this.compiledText = this.originalText + "";//str copy
        if (this.hasparen) { //same parentheses handling
            if (this.multiLine) {
                this.compiledText = "\\left(" + this.originalText + "\\right)";
            } else {
                this.compiledText = "(" + this.originalText + ")";
            }
        }
        return;

    }

    if (this.reqPN[0] == true || this.reqPN[1] == true) { //in case of fracs,square roots, powers, etc: they will be assembled later, currently put the half-compiled text with placeholders in compiledText
        this.compiledText = this.reqPN[2];
    }
}


/** Propagates the multiline property (which is used for deciding if parentheses need \left\right)
* 
*/
TypedMath.prototype.propagateMultiline = function () {
    for (var i = 0; i < this.objects.length; i++) {
        if (this.objects[i].multiLine) {
            this.multiLine = true;
        }
    }
}



/*
* TypedMath.preClean deals with certain cleanups to be run before tokenizing(a token here would be an object enclosed in parentheses). 
* Since the main TypedMath object can only split by parentheses and compile on the basis of the split token, it is necessary to add extra parentheses
* so that compile() recieves fractions/subscripts/etc as separate tokens and can deal with them as such
* 
* The cleanup is run via TypedMath.preClean.run(text). It should be run on _every_ TypedMath object before parenthesizing (It is run in the TypedMath constructor)
* The other methods (sqrt(),frac(),subsup()) are called internally
*/

TypedMath.preClean = {};

/** Runs pre-cleanup
* To be run on the input text of every TypedMath object before it is tokenized
*/
TypedMath.preClean.run = function (text) {
    var t = text + ""; //local scope--actually unecessary
    //the order of running the cleanups is important:
    t = TypedMath.preClean.fracs(t);
    t = TypedMath.preClean.subSup(t);

    t = TypedMath.preClean.sqrt(t);
    t = t.replace(/  /ig, "\\;\\;"); //Single spaces are used to differentiate stuff like "a^ab" and "a^a b". LaTeX hates displaying spaces, so a double typed space maps to a double thick TeX space
    return t;
}

/**Deals with fractions
* Unlike subsup and frac, there is no need to directly parenthesize "/"-->"(/)". As long as the slash is wedged between two properly-parenthesized objects,
* viz "(blah)/(blah)", it will be treated as a separate token by breakIntoParentheses(). This method ensures that it's neighbors are properly parenthesized
*/
TypedMath.preClean.fracs = function (text) {
    if (text.split("/").length == 2) { //Deals with stuff like "1/a+b". If there's only one fraction in a token, the fraction will be greedy and swallow as much as possible
        //NOTE: currently, both blocks of this if do the same thing. I'll need to check up on priority a bit more.
        text = text.replace(/([A-Za-z0-9\*\_\^\/]+)\/([A-Za-z0-9\*\_\^]+)/ig, "($1)/($2)") //swallow letters,numbers,and arithmetic on LHS and RHS
        text = text.replace(/([A-Za-z0-9\*\_\^\/]+)\/(\()/ig, "($1)/$2") //if the RHS already has parentheses--leave it alone
        text = text.replace(/(\))\/([A-Za-z0-9\*\_\^]+)/ig, "$1/($2)")	//ditto LHS			 
    } else {
        text = text.replace(/([A-Za-z0-9\_\^\*\/]+)\/([A-Za-z0-9\_\^\*]+)/ig, "($1)/($2)") //Will fractionize "abc/2de", but not "abc/d+e"(will give "((abc)/(d))+(e)")
        text = text.replace(/([A-Za-z0-9\_\^\*\/]+)\/(\()/ig, "($1)/$2") //if the RHS already has parentheses--leave it alone
        text = text.replace(/(\))\/([A-Za-z0-9\_\^\*]+)/ig, "$1/($2)")	//ditto LHS		
    }
    //cases where part of the fraction is not typed
    text = text.replace(/([^\(])\/\)/ig, "$1(/))")
    //text=text.replace(/\(\/([^\)])/ig,"((/)$1") //add support later--compile() needs to be modified to handle this (trivial) case
    return text;
}

/**Deals with subscripts/superscripts
*/
TypedMath.preClean.subSup = function (text) {
    if (text != "^" && text != "_") { //if the text is just "^"/"_", then it's already been token-ified by breakIntoParentheses(), so no need to do it again and form an infinite loop 
        //Gear ^ up for token-ification by parenthesizing it (then breakIntoParentheses() can handle it):
        text = text.replace(/([^\(])([\^])([^\)]?)/, "$1($2)$3") //Make sure it doesn't have parentheses on atleast one side and parenthesize. Note: "a^)" is valid, the exponent propagates outwards
        text = text.replace(/([^\(]?)([\^])([^\)])/, "$1($2)$3") // Ditto for "(^a"
        text = text.replace(/([^\(])([\_])([^\)])/, "$1($2)$3")  //underscores
        text = text.replace(/<sup>([^\<]+)<\/sup>/ig, "(^)($1)");	//HTML sup
        text = text.replace(/<sub>([^\<]+)<\/sub>/ig, "(_)($1)"); //HTML sub
    }
    return text;
}

/**Deals with square roots
*/
TypedMath.preClean.sqrt = function (text) {
    if (text == "sqrt" || text == "(sqrt)") {
        return text;	//if the text is just sqrt, then it's already been token-ified by breakIntoParentheses(), so no need to do it again and form an infinite loop 
    }
    text = text.replace(/\u221A/ig, "sqrt"); //Unicode square root
    text = text.replace(/\(sqrt\)/ig, "%%PLACEHOLDER.SQUARE_ROOT%%") //if it's been replaced already, placeholder it to prevent double replacement 
    text = text.replace(/sqrt/ig, "(sqrt)") //Make all "sqrt" into separate tokens so that breakIntoParentheses handles them properly
    text = text.replace(/\(sqrt\)\(([^\s])/ig, "(sqrt)( $1") //Allow stuff like sqrt2
    text = text.replace(/\%\%PLACEHOLDER\.SQUARE_ROOT\%\%/ig, "(sqrt)"); //Get rid of placeholder


    //Known bug: currently, the script does not identify stuff like 1/sqrt(4) correctly.

    return text;
}





/** Runs the final "converts" function and gets rid of any remaining replacement artefacts
* To be run on the _compiled_ text of the parent TypedMath object (_after_ compilation of course)
* Add any other methods to be run on the final output of thr *top-level* TypedMath object here
*/
TypedMath.finalSweep = function (text) {
    var t = text + "";
    t = TypedMath.converts.replace(t);
    t = t.replace(/\%([\{\}])\%/ig, "$1").replace(/\%([pn])\%/ig, " "); //replacement artefacts
    return t;
}





/**
* TypedMath.converts deals with final replacements. It consists of arrays of replacements, in "text-to-find":"latex-to-replace-sans-backslash" format
* TypedMath.converts.replace(text) is the method that handles the replacements 
* TypedMath.converts.trig(text) does special trig replacements--called internally by replace()
*/

TypedMath.converts = {}; //Initialise empty object
TypedMath.converts.greekSym = { //Holds all greek Unicode symbols--except \Sigma
    "\u0391": "Alpha",
    "\u0392": "Beta",
    "\u0393": "Gamma",
    "\u0394": "Delta",
    "\u0395": "Epsilon",
    "\u0396": "Zeta",
    "\u0397": "Eta",
    "\u0398": "Theta ",
    "\u0399": "Iota",
    "\u039A": "Kappa",
    "\u039B": "Lambda",
    "\u039C": "Mu",
    "\u039D": "Nu",
    "\u039E": "Xi",
    "\u039F": "Omicron",
    "\u03A0": "Pi",
    "\u03A1": "Rho",

    "\u03A4": "Tau",
    "\u03A5": "Upsilon",
    "\u03A6": "Phi",
    "\u03A7": "Chi",
    "\u03A8": "Psi",
    "\u03A9": "Omega",
    "\u03B1": "alpha",
    "\u03B2": "beta",
    "\u03B3": "gamma",
    "\u03B4": "delta",

    "\u03B6": "zeta",
    "\u03B7": "eta",
    "\u03B8": "theta",
    "\u03B9": "iota",
    "\u03BA": "kappa",
    "\u03BB": "lambda",
    "\u03BC": "mu",
    "\u03BD": "nu",
    "\u03BE": "xi",
    "\u03BF": "omicron",
    "\u03C0": "pi",
    "\u03C1": "rho",
    "\u03C3": "sigma",
    "\u03C4": "tau",
    "\u03C5": "upsilon",

    "\u03C7": "chi",
    "\u03C8": "psi",
    "\u03C9": "omega",


    "\u03D5": "phi",
    "\u03F5": "epsilon",
}


TypedMath.converts.greekLetters = {}; //will hold all greek letter names--dynamically generated from greekSym:
for (i in TypedMath.converts.greekSym) {
    TypedMath.converts.greekLetters[TypedMath.converts.greekSym[i]] = TypedMath.converts.greekSym[i]
}


TypedMath.converts.greekLetters["Sigma"] = "Sigma"; //Since the unicode \Sigma us usually for \Sum, it isn't included in the greekSym array, but should be there in greekLetters
delete TypedMath.converts.greekLetters.eta; //eta likes to overwrite beta/theta/zeta -- and you end up with \b\eta and th\eta. Dealt with in the custom section of TypedMath.converts.replace
delete TypedMath.converts.greekLetters.psi; //ditto for psi (ePSIlon)

TypedMath.converts.math = { //Unicode math symbols and other one-character replacements

    "\u03C6": "varphi",
    "\u03C2": "varsigma",
    "\u03B5": "varepsilon",
    "\u03A3": "sum",
    "\u2200": "forall",
    "\u2202": "partial",
    "\u2203": "exists",
    "\u2206": "delta",
    "\u2207": "nabla",
    "\u2208": "in",
    "\u2209": "notin",
    "\u2213": "mp",
    "\u221D": "propto",
    "\u221E": "infty",
    "\u2227": "wedge",
    "\u2228": "vee",
    "\u2229": "cap",
    "\u222A": "cup",
    "\u222B": "int",
    "\u222C": "iint",
    "\u222D": "iiint",
    "\u222E": "oint",
    "\u2234": "therefore",
    "\u2235": "because",
    "\u223C": "approx",
    "~": "approx",
    "\u2248": "approx",
    "\u2243": "simeq",
    "\u2245": "cong",
    "\u2260": "neq",
    "\u2261": "equiv",
    "\u2264": "leq",
    "\u2265": "geq",
    "\u226A": "ll",
    "\u226B": "gg",
    "\u2282": "subset",
    "\u2283": "supset",
    "\u2297": "otimes",
    "\u2299": "odot",


    "\\*": "times",
    "\\.": "cdot",
    "nabla": "nabla",
    "integral": "int",
}
TypedMath.converts.functions = { // stuff like \log and \exp
    "log": "log",
    "exp": "exp",
}

TypedMath.converts.replace = function (text) {
    var t = " " + text;
    var a;
    //iterate through the various arrays in TypedMath.converts, do a simple replace.
    var subarrays = ["greekSym", "greekLetters", "math", "functions"];
    for (var i = 0; i < subarrays.length; i++) {
        for (var j in TypedMath.converts[subarrays[i]]) {
            a = new RegExp("(^||[^\\\\])" + j, "g");//should not begin with a \ already
            t = t.replace(a, "$1\\" + TypedMath.converts[subarrays[i]][j] + " ");
        }
    }
    //Custom stuff here:
    //handle eta without blowing up beta and theta and zeta. Ditto psi:
    t = t.replace(/(b|th|z)?eta/g, function ($0, $1) { return $1 ? $0 : "\\eta "; });
    t = t.replace(/(e)?psi(?!(lon))/ig, function ($0, $1) { return $1 ? $0 : "\\psi "; })
    t = TypedMath.converts.trig(t);
    return t;

}

TypedMath.converts.trig = function (text) {
    //Special handling for trig functions--they like to overwrite each other
    text = text.replace(/(a|arc|\\)?(sin|cos|tan)(?!(h|ec))/g, function ($0, $1) { return $1 ? $0 : "\\" + $0; }); //\sin,\cos,\tan ONLY. I'm using an equivalent lookbehind method that I found here: http://stackoverflow.com/a/642746/1198729
    text = text.replace(/(arc)(sin|cos|tan)/g, "\\$1$2")
    text = text.replace(/(a)(sin|cos|tan)/g, "\\$2^{-1}")
    text = text.replace(/(sin|cos|tan)(h)/g, "\\$1$2")
    text = text.replace(/(co)?sec/g, function ($0, $1) { return $1 ? $0 : "\\sec"; });
    text = text.replace(/(csc|cot)/g, "\\$1")
    text = text.replace(/cosec/g, "\\mathrm{cosec}");
    text += " "//stuff like \sinA breaks LaTeX
    return text;

}