(async () => {
  const chai = await import('chai');
  const chaiHttp = await import('chai-http');

  chai.default.use(chaiHttp.default);
  const { expect } = chai.default;

  describe('User API', () => {
    it('should retrieve the user by username', (done) => {
      chai.default.request('http://localhost:5001')
        .get('/api/users/admin_user')
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.be.an('object');
          expect(res.body.user).to.have.property('username', 'admin_user');
          done();
        });
    });
  });
})();
