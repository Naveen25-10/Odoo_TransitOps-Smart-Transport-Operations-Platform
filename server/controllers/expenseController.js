const data = require('../data/mockData');

exports.getExpenses = (req, res) => {
    res.json(data.expenses);
};

exports.addExpense = (req, res) => {
    const newExpense = {
        id: data.expenses.length + 1,
        ...req.body
    };
    data.expenses.push(newExpense);
    res.status(201).json(newExpense);
};
