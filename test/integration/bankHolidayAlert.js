const chai = require('chai');
const chaiHttp = require('chai-http');
const cheerio = require('cheerio');
const nock = require('nock');

const constants = require('../../app/lib/constants');
const getSampleResponse = require('../resources/getSampleResponse');
const iExpect = require('../lib/expectations');
const postcodesIOURL = require('../lib/constants').postcodesIOURL;
const server = require('../../server');

const expect = chai.expect;

chai.use(chaiHttp);

const resultsRoute = `${constants.SITE_ROOT}/results`;
const resultsCount = constants.api.nearbyResultsCount;
const yourLocation = constants.yourLocation;

describe('The bank holiday alert messaging', () => {
  after('clean nock', () => {
    nock.cleanAll();
  });

  afterEach('reset DATETIME', () => {
    process.env.DATETIME = '2017-12-12T12:00:00';
  });

  describe('on the day of the bank holiday', () => {
    before('set DATETIME', () => {
      process.env.DATETIME = '2017-12-25T12:00:00';
    });

    it('should show a message about the bank holiday for each result that is open', async () => {
      const reverseGeocodeResponse = getSampleResponse('postcodesio-responses/reverseGeocodeEngland.json');
      const serviceApiResponse = getSampleResponse('service-api-responses/-1,54.json');
      const latitude = 52.75;
      const longitude = -1.55;

      nock(postcodesIOURL)
        .get('/postcodes')
        .query({
          lat: latitude, limit: 1, lon: longitude, radius: 20000, wideSearch: true,
        })
        .times(1)
        .reply(200, reverseGeocodeResponse);

      nock(process.env.API_BASE_URL)
        .get(`/open?latitude=${latitude}&longitude=${longitude}&limits:results=${resultsCount}`)
        .times(1)
        .reply(200, serviceApiResponse);

      const res = await chai.request(server)
        .get(resultsRoute)
        .query({ latitude, location: yourLocation, longitude });

      iExpect.htmlWith200Status(res);
      const $ = cheerio.load(res.text);

      const warnings = $('.callout--warning');
      expect(warnings.length).to.equal(10);
      warnings.toArray().forEach((item) => {
        expect($(item).text()).to.equal('Today is a bank holiday. Please call to check opening times.');
      });
    });
  });
});
