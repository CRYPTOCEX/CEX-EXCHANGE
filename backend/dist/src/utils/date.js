"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEndDate = void 0;
const getEndDate = (duration, timeframe, startDate = new Date()) => {
    switch (timeframe) {
        case "HOUR":
            startDate.setHours(startDate.getHours() + duration);
            break;
        case "DAY":
            startDate.setDate(startDate.getDate() + duration);
            break;
        case "WEEK":
            startDate.setDate(startDate.getDate() + duration * 7);
            break;
        case "MONTH":
            startDate.setMonth(startDate.getMonth() + duration);
            break;
    }
    return startDate;
};
exports.getEndDate = getEndDate;
