const cheerio = require('cheerio');
const chai = require('chai');
const chaiHttp = require('chai-http');

const constants = require('../../app/lib/constants');
const iExpect = require('../lib/expectations');
const server = require('../../server');

const expect = chai.expect;

chai.use(chaiHttp);

describe('redirection', () => {
  it('should redirect root requests to /find-a-pharmacy/', async () => {
    const res = await chai.request(server).get('/');
    iExpect.htmlWith200Status(res);

    expect(res).to.redirect;
    expect(res.req.path).to.equal(`${constants.SITE_ROOT}/`);
  });
});

describe('An unknown page', () => {
  it('should return a 404', async () => {
    try {
      await chai.request(server).get(`${constants.SITE_ROOT}/not-known`);
    } catch (err) {
      expect(err).to.have.status(404);
      expect(err.response).to.be.html;
      const $ = cheerio.load(err.response.text);
      expect($('.nhsuk-page-heading').text().trim())
        .to.equal('Page not found');
      expect($('head title').text()).to.equal('Page not found - NHS');
    }
  });
});

describe('meta tags', () => {
  it('should instruct Webtrends to anonymise IP Addresses', async () => {
    const res = await chai.request(server).get('/');
    const $ = cheerio.load(res.text);

    expect($('meta[name="DCS.dcsipa"]').prop('content')).to.equal('1');
  });
});
