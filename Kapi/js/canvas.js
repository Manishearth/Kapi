function initCanvas() {
    pasteHtmlAtCaretUnselect("<div id='currcanvasdiv'><canvas id='paint' style='border:1px solid black;'></canvas></div>")
    ediv = document.getElementById("editdiv");
    ediv.contentEditable = false;
    ediv.ondblclick = exitCanvas();
}

function exitCanvas() {
    ediv.contentEditable = true;
}