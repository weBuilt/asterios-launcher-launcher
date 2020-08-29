import {app, BrowserWindow, ipcMain, dialog, IpcMainEvent/*, shell*/} from "electron";
import * as path from "path";
import config from "../config.json";
// import os from "os";
import fs from "fs";

let mainWindowId: number;
let asteriosPath: string;
if (config.asteriosPath) asteriosPath = config.asteriosPath as string;

function createWindow() {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: true,
        },
        width: 800,
    });
    mainWindowId = mainWindow.id;

    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, "../../index.html"));

    // Open the DevTools.
    mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
    createWindow();

    app.on("activate", () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
ipcMain.on('open-file-dialog', (event) => {
    const select = dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: "Select Aterios root folder",
    })
    select.then((files) => {
        if (files) {
            asteriosPath = files.filePaths[0];
            saveConfig();
            event.sender.send('selected-directory', files.filePaths[0]);
        }
    })
})
ipcMain.on('synchronous-message', (event, args) => {
    let command = args.toString()

    if (args instanceof Array) command = args[0];
    switch (command) {
        case "asterios-path-specified":
            checkAsteriosPath(event)
    }
})

function checkAsteriosPath(event: IpcMainEvent) {
    if (asteriosPath) {
        event.returnValue = ["asterios-path-specified", asteriosPath];
    } else
        event.returnValue = ["asterios-path-not-specified"]
}

function saveConfig() {
    config.asteriosPath = asteriosPath;
    fs.writeFile("file:///../config.json", JSON.stringify(config), () => {return;});
}