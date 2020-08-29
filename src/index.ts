// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process unless
// nodeIntegration is set to true in webPreferences.
// Use preload.js to selectively enable features
// needed in the renderer process.
const {ipcRenderer} = require('electron')

const selectDirBtn = document.getElementById("select-asterios-path")

selectDirBtn.addEventListener('click', (_) => {
    ipcRenderer.send('open-file-dialog')
})

ipcRenderer.on('selected-directory', (event, path) => {
    document.getElementById("asterios-path").innerHTML = path.toString();
    selectDirBtn.remove();
})

const askOnLoad = ipcRenderer.sendSync('synchronous-message', ["asterios-path-specified"])
let command = askOnLoad.toString();
if (askOnLoad instanceof Array) command = askOnLoad[0];
switch (command) {
    case "asterios-path-specified":
        document.getElementById("asterios-path").innerHTML = askOnLoad[1];
        selectDirBtn.remove();
        break;
    case "asterios-path-not-specified":
        break;
}
