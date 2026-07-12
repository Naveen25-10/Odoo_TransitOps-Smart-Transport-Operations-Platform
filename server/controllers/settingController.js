const data = require('../data/mockData');

exports.getProfile = (req, res) => {
    res.json(data.profile);
};

exports.updateProfile = (req, res) => {
    data.profile = { ...data.profile, ...req.body };
    res.json(data.profile);
};

exports.updatePassword = (req, res) => {
    // Mock password update
    res.json({ message: "Password updated successfully" });
};

exports.getRoles = (req, res) => {
    res.json(data.roles);
};
