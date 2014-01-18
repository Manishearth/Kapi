function addMathRegion() {
    MathJax.Hub.Config({
        tex2jax: {
            inlineMath: [["$", "$"], ["\\(", "\\)"]]
        }
    });
    pasteHtmlAtCaret("<span style='padding:4px;margin:4px;background-color:magenta' id=currspan><span>.</span></span>")
    var ediv = document.getElementById('editdiv');
    
    ediv.contentEditable = false
    var cspan = document.getElementById('currspan');
    cspan.id=""
    cspan.contentEditable = true
    cspan.onkeyup=updPreview(cspan)
    cspan.onkeypress = function (e) {
         if (e.which == 13) {
            ediv.contentEditable = true
            delete cspan.onkeypress
            delete cspan.onkeyup
            cspan.contentEditable = true
            cspan.codetext = cspan.innerHTML

            document.getElementById('previewdiv').innerHTML = "\\[" + TypedMath.wholeShebang(cspan.textContent) + "\\]";
            dspan = document.createElement('span')
            dspan.contentEditable = false;
            addTxt(dspan, "\\(" + TypedMath.wholeShebang(cspan.textContent) + "\\)")
            cspan.innerHTML = ""
             cspan.appendChild(dspan)
            MathJax.Hub.Queue(["Typeset", MathJax.Hub, cspan])
            MathJax.Hub.Queue(["Typeset", MathJax.Hub, document.getElementById('previewdiv')])
            cspan.style.backgroundColor="#EEEEEE"
            e.preventDefault()
            e.stopPropagation()
            var nrange = window.getSelection().getRangeAt(0).cloneRange()
            nrange.deleteContents()
            nrange.setStartAfter(cspan);
            nrange.collapse(true);

            window.getSelection().removeAllRanges()
            window.getSelection().addRange(nrange)
            return false;
         }
         


    }
}
function updPreview(spn) {
    return function () {
        addTxt(document.getElementById('previewdiv'),"\\[" + TypedMath.wholeShebang(spn.textContent) + "\\]");
        MathJax.Hub.Queue(["Typeset", MathJax.Hub, document.getElementById('previewdiv')])
    }

}
function backToText() {

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

            // Preserve the selection
            if (lastNode) {
                range = range.cloneRange();
                range.setStartBefore(lastNode.childNodes[0]);
                range.setEndAfter(lastNode.childNodes[0]);

                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    } else if (document.selection && document.selection.type != "Control") {
        // IE < 9
        document.selection.createRange().pasteHTML(html);
    }
}