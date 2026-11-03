const Solution = require('../models/solution.model');
const Unanswered = require('../models/unanswered.model');

// Solutions
const getSolutions = async (req, res) => {
  try {
    const solutions = await Solution.find({}).sort({ createdAt: -1 });
    res.json(solutions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const saveSolution = async (req, res) => {
  try {
    const solution = await Solution.create(req.body);
    res.status(201).json(solution);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateSolution = async (req, res) => {
  try {
    const solution = await Solution.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(solution);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteSolution = async (req, res) => {
  try {
    await Solution.findByIdAndDelete(req.params.id);
    res.json({ message: 'Solution deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Chat logic (simplified match)
const chat = async (req, res) => {
  try {
    const { message } = req.body;
    // We handle the actual best match logic on frontend in troubleshoot.jsx, 
    // but the backend can return a specific reply if needed.
    // For now, let's just log it or return a placeholder if no direct match.
    res.json({ reply: "Thinking..." }); 
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Unanswered Questions
const getUnanswered = async (req, res) => {
  try {
    const questions = await Unanswered.find({}).sort({ createdAt: -1 });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const saveUnanswered = async (req, res) => {
  try {
    const question = await Unanswered.create(req.body);
    res.status(201).json(question);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteUnanswered = async (req, res) => {
  try {
    await Unanswered.findByIdAndDelete(req.params.id);
    res.json({ message: 'Question deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSolutions,
  saveSolution,
  updateSolution,
  deleteSolution,
  chat,
  getUnanswered,
  saveUnanswered,
  deleteUnanswered
};
