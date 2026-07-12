const data = require('../data/mockData');

exports.getDashboard = (req, res) => {
    res.json(data.dashboard);
};

exports.getMonthly = (req, res) => {
    res.json(data.monthlyReports);
};

exports.getRoi = (req, res) => {
    res.json(data.roi);
};
