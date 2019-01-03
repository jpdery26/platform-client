import { expect } from 'chai';
import { UrlService } from '../../../src/commons/rest/UrlService';
import { config } from '../../../src/config/index';

export const UrlServiceTest = () => {
  describe('UrlServices', () => {
    it('Should generate the url to get fields', () => {
      const getFieldsPageUrl = UrlService.getFieldsPageUrl('myOrgId', 0);
      expect(getFieldsPageUrl).to.equal(
        `${config.coveo.platformUrl}/rest/organizations/myOrgId/sources/page/fields?&page=0&perPage=1000&origin=USER&includeMappings=false`
      );
    });

    it('Should generate the url to get field definition', () => {
      const fieldDefinition = UrlService.getFieldDocs();
      expect(fieldDefinition).to.equal(`${config.coveo.platformUrl}/api-docs/Field?group=public`);
    });

    it('Should generate the url to update fields', () => {
      const updateFields = UrlService.updateFields('myOrgId');
      expect(updateFields).to.equal(`${config.coveo.platformUrl}/rest/organizations/myOrgId/indexes/fields/batch/update`);
    });

    it('Should generate the url to get fields', () => {
      const createFields = UrlService.createFields('myOrgId');
      expect(createFields).to.equal(`${config.coveo.platformUrl}/rest/organizations/myOrgId/indexes/fields/batch/create`);
    });

    it('Should generate the url to delete fields', () => {
      const deleteFields = UrlService.deleteFields('myOrgId', ['rambo', 'unicorne']);
      expect(deleteFields).to.equal(
        `${config.coveo.platformUrl}/rest/organizations/myOrgId/indexes/fields/batch/delete?fields=rambo%2Cunicorne`
      );
    });

    it('Should generate the url to get all extensions', () => {
      const createFields = UrlService.getExtensionsUrl('myOrgId');
      expect(createFields).to.equal(`${config.coveo.platformUrl}/rest/organizations/myOrgId/extensions`);
    });

    it('Should generate the url to get a specific extensions', () => {
      const createFields = UrlService.getSingleExtensionUrl('myOrgId', 'myExtension');
      expect(createFields).to.equal(`${config.coveo.platformUrl}/rest/organizations/myOrgId/extensions/myExtension`);
    });

    it('Should generate the url to get all sources', () => {
      const url = UrlService.getSourcesUrl('myOrgId');
      expect(url).to.equal(`${config.coveo.platformUrl}/rest/organizations/myOrgId/sources`);
    });

    it('Should generate the url to get a specific source', () => {
      const url = UrlService.getSingleSourceUrl('myOrgId', 'mySource');
      expect(url).to.equal(`${config.coveo.platformUrl}/rest/organizations/myOrgId/sources/mySource`);
    });

    it('Should generate the url to create a source', () => {
      const url = UrlService.createSource('myOrgId');
      expect(url).to.equal(`${config.coveo.platformUrl}/rest/organizations/myOrgId/sources?rebuild=false`);

      const url2 = UrlService.createSource('myOrgId', true);
      expect(url2).to.equal(`${config.coveo.platformUrl}/rest/organizations/myOrgId/sources?rebuild=true`);
    });

    it('Should generate the url to update a source', () => {
      const url = UrlService.updateSource('myOrgId', 'mySource');
      expect(url).to.equal(`${config.coveo.platformUrl}/rest/organizations/myOrgId/sources/mySource?rebuild=false`);

      const url2 = UrlService.updateSource('myOrgId', 'mySource', true);
      expect(url2).to.equal(`${config.coveo.platformUrl}/rest/organizations/myOrgId/sources/mySource?rebuild=true`);
    });

    it('Should generate the url to get the Field documentation', () => {
      const fieldDoc = UrlService.getFieldDocs();
      expect(fieldDoc).to.equal(`${config.coveo.platformUrl}/api-docs/Field?group=public`);
    });
  });
};
