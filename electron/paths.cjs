const { app } = require('electron')
const path = require('path')

const dataPath = () => path.join(app.getPath('userData'), 'gsm-data.json')
const templatePath = () => path.join(app.getPath('userData'), 'statement-template.xlsx')
const templateMetaPath = () => path.join(app.getPath('userData'), 'statement-template.json')
const errorLogPath = () => path.join(app.getPath('userData'), 'gsm-errors.log')

module.exports = { dataPath, templatePath, templateMetaPath, errorLogPath }
