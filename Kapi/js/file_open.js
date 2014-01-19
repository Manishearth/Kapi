function openbutton() {
    // Verify that we are currently not snapped, or that we can unsnap to open the picker
    var currentState = Windows.UI.ViewManagement.ApplicationView.value;
    if (currentState === Windows.UI.ViewManagement.ApplicationViewState.snapped &&
        !Windows.UI.ViewManagement.ApplicationView.tryUnsnap()) {
        // Fail silently if we can't unsnap
        return;
    }

    // Create the picker object and set options
    var openPicker = new Windows.Storage.Pickers.FileOpenPicker();
    openPicker.viewMode = Windows.Storage.Pickers.PickerViewMode.list;
    openPicker.suggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.picturesLibrary;
    // Users expect to have a filtered view of their folders depending on the scenario.
    // For example, when choosing a documents folder, restrict the filetypes to documents for your application.
    openPicker.fileTypeFilter.replaceAll([".kapi"]);

    // Open the picker for the user to pick a file
    openPicker.pickSingleFileAsync().then(function (file) {
        if (file) {
            // Application now has read/write access to the picked file
            Windows.Storage.FileIO.readTextAsync(file).then(function (t) { unserialize(t) })
            WinJS.log && WinJS.log("Picked file: " + file.name, "sample", "status");
        } else {
            // The picker was dismissed with no selected file
            WinJS.log && WinJS.log("Operation cancelled.", "sample", "status");
        }
    });

}

function unserialize(text) {
    document.getElementById("editdiv").innerHTML = toStaticHTML(text);
    document.getElementById("editdiv").contentEditable=true
    nodes = document.getElementById("editdiv").getElementsByClassName('mathspan')
    for (i = 0; i < nodes.length; i++) {
        
        dspan = document.createElement('span')
        dspan.contentEditable = false;
        addTxt(dspan, "\\(" + TypedMath.wholeShebang(nodes[i].getAttribute('data-codetext')) + "\\)")
        nodes[i].innerHTML = ""
        nodes[i].appendChild(dspan)
        nodes[i].codetext=nodes[i].getAttribute('data-codetext')
        nodes[i].ondblclick=backToTextClo(nodes[i])
    }
    MathJax.Hub.Config({
        tex2jax: {
            inlineMath: [["$", "$"], ["\\(", "\\)"]]
        }
    });
    MathJax.Hub.Queue(["Typeset", MathJax.Hub, document.getElementById('editdiv')])
    
}