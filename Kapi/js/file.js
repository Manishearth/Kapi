
    function saveButton() {
        // Verify that we are currently not snapped, or that we can unsnap to open the picker
        var currentState = Windows.UI.ViewManagement.ApplicationView.value;
        if (currentState === Windows.UI.ViewManagement.ApplicationViewState.snapped &&
            !Windows.UI.ViewManagement.ApplicationView.tryUnsnap()) {
            // Fail silently if we can't unsnap
            return;
        }
        // Create the picker object and set options
        var savePicker = new Windows.Storage.Pickers.FileSavePicker();
        savePicker.suggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.documentsLibrary;
        // Dropdown of file types the user can save the file as
        savePicker.fileTypeChoices.insert("Kapi file", [".kapi"]);
        // Default file name if the user does not type one in or select a file to replace
        savePicker.suggestedFileName = "Newnote.kapi";

        savePicker.pickSaveFileAsync().then(function (file) {
            if (file) {
                // Prevent updates to the remote version of the file until we finish making changes and call CompleteUpdatesAsync.
                Windows.Storage.CachedFileManager.deferUpdates(file);
                // write to file
                Windows.Storage.FileIO.writeTextAsync(file, document.getElementById("editdiv").innerHTML).done(function () {
                    // Let Windows know that we're finished changing the file so the other app can update the remote version of the file.
                    // Completing updates may require Windows to ask for user input.
                    Windows.Storage.CachedFileManager.completeUpdatesAsync(file).done(function (updateStatus) {
                        if (updateStatus === Windows.Storage.Provider.FileUpdateStatus.complete) {
                            WinJS.log && WinJS.log("File " + file.name + " was saved.", "sample", "status");
                        } else {
                           WinJS.log && WinJS.log("File " + file.name + " couldn't be saved.", "sample", "status");
                        }
                    });
                });
            } else {
                WinJS.log && WinJS.log("Operation cancelled.", "sample", "status");
            }
        });

    }

    function newbutton() {
        //dosomeshit

    }

    function exportbutton(){
        html2canvas(document.getElementById('editdiv'), {
            onrendered: function (canvas) {
               
                Canvas2Image.saveAsPNG(canvas);
            }
        });

    }