"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderJsonReport = renderJsonReport;
function renderJsonReport(report, options = {}) {
    return `${JSON.stringify(report, null, options.pretty === false ? 0 : 2)}\n`;
}
