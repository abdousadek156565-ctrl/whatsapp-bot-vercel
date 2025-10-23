// This file ensures Vercel recognizes the repository structure
// The actual serverless function is in /api/index.js

module.exports = (req, res) => {
  res.redirect('/');
};