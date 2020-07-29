module.exports = async (req, res, next) => {
  if (req.headers['x-admin-token'] === process.env.ADMIN_TOKEN) {
    console.log('admin')
    return next()
  }
  return res.status(401).json({
    success: 0,
    message: 'unauthorized'
  })
}