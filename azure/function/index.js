module.exports = async function (context, req, documents) {
  let users = documents && documents[0] && documents[0].users;
  if (!users) {
    return { status: 404 };
  }
  let user = users.filter(u => u.handle === req.params.handle)[0];
  if (!user) {
    return { status: 404 };
  }
  return {
    status: 200,
    body: JSON.stringify(user)
  };
}
