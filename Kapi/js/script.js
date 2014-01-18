function addMathRegion() {
    pasteHtmlAtCaret("<span style='padding:4px;margin:4px;background-color:magenta' id=currspan><span>.</span></span>")
    var ediv = document.getElementById('editdiv');
    
    ediv.contentEditable = false
    var cspan = document.getElementById('currspan');
    
    cspan.contentEditable = true
    cspan.onkeypress = function (e) {
        if (e.which == 13) {
            ediv.contentEditable = true
            delete cspan.onkeypress
            cspan.contenteditable = false
            cspan.codetext = cspan.innerHTML
            cspan.innerHTML = "fart"
            e.preventDefault()
            e.stopPropagation()
            return false;
        }
    }
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