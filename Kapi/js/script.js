window.mathmode = false;
function addMathRegion() {

    MathJax.Hub.Config({
        tex2jax: {
            inlineMath: [["$", "$"], ["\\(", "\\)"]]
        }
    });

    var ediv = document.getElementById('editdiv');
    if (window.mathmode) { ediv.ondblclick = false; mkPressHandler(document.getElementById('currspan'))("blah"); return;}
    window.mathmode = true;
    mathiconupd();
    if (window.getSelection().rangeCount <= 0) {
        var r = document.createRange();
        var s = document.getSelection();
        r.selectNodeContents(document.getElementById("editdiv"));
        r.collapse(true);
        
        s.addRange(r);
    }
    pasteHtmlAtCaret("<span style='padding:4px;margin:4px;background-color:#FFF' class=mathspan id=currspan><input id=currinp size=2 ></span>")

    
    ediv.contentEditable = false
    var cspan = document.getElementById('currspan');
    var inp = document.getElementById('currinp')
    cspan.inp=inp
    inp.onkeyup = function () { this.size = this.value.length + 2 }
    inp.focus()
    cspan.contentEditable = true
    cspan.onkeyup=updPreview(cspan)
    cspan.onkeypress = mkPressHandler(cspan)
    ediv.ondblclick = function () { ediv.ondblclick=false;mkPressHandler(cspan)("blah") }
    cspan.ondblclick = function (e) { e.stopPropagation(); }
    
}
function updPreview(spn) {
    return function () {
        addTxt(document.getElementById('previewdiv'),"\\[" + TypedMath.wholeShebang(spn.inp.value) + "\\]");
        MathJax.Hub.Queue(["Typeset", MathJax.Hub, document.getElementById('previewdiv')])
    }

}
function mathiconupd() {
    if (window.mathmode) {
        document.getElementById("mathicon").className = "fa fa-thumbs-up fa-3x"
        document.getElementById("mathtext").innerHTML="Done!"
    } else {
        document.getElementById("mathicon").className = "fa fa-superscript fa-3x"
        document.getElementById("mathtext").innerHTML = "Add math"

    }
}
function mkPressHandler(cspan){
    return function (e) {
        if (e.which == 13||e=="blah") {
            var ediv = document.getElementById('editdiv');
            ediv.contentEditable = true
            cspan.onkeypress = false
            cspan.id=""
            cspan.onkeyup =false
            cspan.ondblclick =false
            ediv.ondblclick = false
            ediv.ondblclick = false;
            //cspan.contentEditable = true
            cspan.codetext = cspan.inp.value
           
            document.getElementById('previewdiv').innerHTML = "";
            dspan = document.createElement('span')
            dspan.contentEditable = false;
            addTxt(dspan, "\\(" + TypedMath.wholeShebang(cspan.inp.value) + "\\)")
            cspan.innerHTML = ""
            cspan.appendChild(dspan)
            MathJax.Hub.Queue(["Typeset", MathJax.Hub, cspan])
            MathJax.Hub.Queue(["Typeset", MathJax.Hub, document.getElementById('previewdiv')])
            cspan.style.backgroundColor = "#FFF"
            cspan.ondblclick = backToTextClo(cspan);
            if(e.preventDefault){
            e.preventDefault()
            e.stopPropagation()
             }
            var nrange = window.getSelection().getRangeAt(0).cloneRange()
           // nrange.deleteContents()
            nrange.setStartAfter(cspan);
            nrange.collapse(true);

            window.getSelection().removeAllRanges()
            window.getSelection().addRange(nrange)
            window.mathmode = false;
            mathiconupd()
            return false;
        }
    }
}
function backToTextClo(cspan) {

    return function (e) {
        
        cspan.innerHTML = "<input id=currinp>"
        
        cspan.inp=document.getElementById("currinp")
        cspan.inp.value = cspan.codetext
        cspan.inp.value.size = cspan.codetext.length+2
       // cspan.style.backgroundColor = "#EEE"
        var ediv = document.getElementById('editdiv');
        window.mathmode = true;
        mathiconupd()
        ediv.contentEditable = false
        cspan.contentEditable = true
        cspan.onkeyup=updPreview(cspan)
        cspan.onkeypress = mkPressHandler(cspan)
        ediv.ondblclick = function () { ediv.ondblclick=false; mkPressHandler(cspan)("blah") }
        cspan.ondblclick = function (e) { e.stopPropagation(); }
        cspan.inp.onkeyup = function () { this.size = this.value.length + 2 }
        cspan.inp.focus()
        e.stopPropagation()
        e.preventDefault()
        return false;
    }
}
function addTxt(el,txt) {
    
   // while (el.childNodes.length >= 1) {
     //   el.removeChild(el.firstChild);
    //}
    el.innerHTML = "";
    el.appendChild(el.ownerDocument.createTextNode(txt));
}
function pasteHtmlAtCaret(html) {
    var sel, range;
    if (window.getSelection) {
        // IE9 and non-IE
        sel = window.getSelection();
        if (sel.getRangeAt && sel.rangeCount) {
            range = sel.getRangeAt(0);
            range.deleteContents();

            // Range.createContextualFragment() would be useful here but is
            // only relatively recently standardized and is not supported in
            // some browsers (IE9, for one)
            var el = document.createElement("div");
            el.innerHTML = html;
            var frag = document.createDocumentFragment(), node, lastNode;
            while ((node = el.firstChild)) {
                lastNode = frag.appendChild(node);
            }
            range.insertNode(frag);


        }
    } else if (document.selection && document.selection.type != "Control") {
        // IE < 9
        document.selection.createRange().pasteHTML(html);
    }
}

function pasteHtmlAtCaretUnselect(html) {
    var sel, range;
    if (window.getSelection().rangeCount <= 0) {
        var r = document.createRange();
        var s = document.getSelection();
        r.selectNodeContents(document.getElementById("editdiv"));
        r.collapse(true);

        s.addRange(r);
    }
        // IE9 and non-IE
        sel = window.getSelection();
        if (sel.getRangeAt && sel.rangeCount) {
            range = sel.getRangeAt(0);
            range.deleteContents();

            // Range.createContextualFragment() would be useful here but is
            // only relatively recently standardized and is not supported in
            // some browsers (IE9, for one)
            var el = document.createElement("div");
            el.innerHTML = html;
            var frag = document.createDocumentFragment(), node, lastNode;
            while ((node = el.firstChild)) {
                lastNode = frag.appendChild(node);
            }
            range.insertNode(frag);

            // Preserve the selection
            if (lastNode) {
                range = range.cloneRange();
                range.setStartBefore(lastNode.childNodes[0]);
                range.setEndAfter(lastNode.childNodes[0]);
                console.log(range.startOffset, range.endOffset)

                sel.removeAllRanges();
                sel.addRange(range);
                lastNode.childNodes[0].click()
            }
        }

}
