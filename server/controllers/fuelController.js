const data = require('../data/mockData');

exports.getFuelLogs = (req, res) => {
    res.json(data.fuelLogs);
};

exports.addFuelLog = (req, res) => {
    const newLog = {
        id: data.fuelLogs.length + 1,
        ...req.body
    };
    data.fuelLogs.push(newLog);
    res.status(201).json(newLog);
};
