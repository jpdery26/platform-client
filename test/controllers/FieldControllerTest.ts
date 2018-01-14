// tslint:disable:no-magic-numbers
import * as nock from 'nock';
import { expect, assert } from 'chai';
import { Organization } from './../../src/coveoObjects/Organization';
import { FieldController } from './../../src/controllers/FieldController';
import { DiffResultArray } from '../../src/commons/collections/DiffResultArray';
import { Field } from '../../src/coveoObjects/Field';
import { UrlService } from '../../src/commons/rest/UrlService';
import { RequestUtils } from '../../src/commons/utils/RequestUtils';
import { Utils } from '../../src/commons/utils/Utils';
import { StaticErrorMessage } from '../../src/commons/errors';
import { IGraduateOptions, IHTTPGraduateOptions } from '../../src/commands/GraduateCommand';

export const FieldControllerTest = () => {
  describe('Field Controller', () => {
    // Organizations
    const org1: Organization = new Organization('dev', 'xxx');
    const org2: Organization = new Organization('prod', 'yyy');

    // Fields

    const field1: Field = new Field('field1', {
      name: 'firstname',
      description: 'The first name of a person',
      type: 'STRING',
      includeInQuery: true
    });
    const field2: Field = new Field('field2', {
      name: 'lastname',
      description: 'The last name of a person',
      type: 'STRING',
      includeInQuery: true
    });
    const field3: Field = new Field('field3', {
      name: 'birth',
      description: 'Day of birth',
      type: 'Date',
      includeInQuery: false
    });

    // Controller
    const fieldController = new FieldController(org1, org2);

    let scope: nock.Scope;

    afterEach(() => {
      if (Utils.exists(scope)) {
        expect(scope.pendingMocks(), scope.pendingMocks().toString()).to.be.empty;
      }

      // Reset Orgs
      org1.clearFields();
      org2.clearFields();
    });

    describe('GetCleanVersion Method', () => {
      it('Should return the clean diff version - empty', () => {
        const diffResultArray: DiffResultArray<Field> = new DiffResultArray();
        const cleanVersion = fieldController.getCleanVersion(diffResultArray);
        expect(cleanVersion).to.eql({
          summary: { TO_CREATE: 0, TO_UPDATE: 0, TO_DELETE: 0 },
          TO_CREATE: [],
          TO_UPDATE: [],
          TO_DELETE: []
        });
      });

      it('Should return the clean diff version', () => {
        const diffResultArray: DiffResultArray<Field> = new DiffResultArray();
        diffResultArray.TO_CREATE.push(field1);
        diffResultArray.TO_UPDATE.push(field2);
        diffResultArray.TO_UPDATE.push(field3);

        const cleanVersion = fieldController.getCleanVersion(diffResultArray);
        expect(cleanVersion).to.eql({
          summary: { TO_CREATE: 1, TO_UPDATE: 2, TO_DELETE: 0 },
          TO_CREATE: [
            {
              name: 'firstname',
              description: 'The first name of a person',
              type: 'STRING',
              includeInQuery: true
            }
          ],
          TO_UPDATE: [
            {
              name: 'lastname',
              description: 'The last name of a person',
              type: 'STRING',
              includeInQuery: true
            },
            {
              name: 'birth',
              description: 'Day of birth',
              type: 'Date',
              includeInQuery: false
            }
          ],
          TO_DELETE: []
        });
      });
    });

    describe('Diff Method', () => {
      it('Should return an empty diff result', (done: MochaDone) => {
        scope = nock(UrlService.getDefaultUrl())
          // First expected request
          .get('/rest/organizations/dev/indexes/page/fields')
          .query({ page: 0, perPage: 400, origin: 'USER' })
          .reply(RequestUtils.OK, {
            items: [
              {
                name: 'allmetadatavalues',
                description: 'new description',
                type: 'STRING'
              },
              {
                name: 'new field',
                description: 'The attachment depth.',
                type: 'STRING'
              }
            ]
          })
          .get('/rest/organizations/prod/indexes/page/fields')
          .query({ page: 0, perPage: 400, origin: 'USER' })
          .reply(RequestUtils.OK, {
            items: [
              {
                name: 'allmetadatavalues',
                description: 'new description',
                type: 'STRING'
              },
              {
                name: 'new field',
                description: 'The attachment depth.',
                type: 'STRING'
              }
            ]
          });

        fieldController
          .diff()
          .then((diff: DiffResultArray<Field>) => {
            expect(diff.containsItems()).to.be.false;
            done();
          })
          .catch((err: any) => {
            done(err);
          });
      });

      it('Should not return the diff result', (done: MochaDone) => {
        scope = nock(UrlService.getDefaultUrl())
          // First expected request
          .get('/rest/organizations/dev/indexes/page/fields')
          .query({ page: 0, perPage: 400, origin: 'USER' })
          .reply(RequestUtils.ACCESS_DENIED, { message: 'Access is denied.', errorCode: 'ACCESS_DENIED' })
          .get('/rest/organizations/prod/indexes/page/fields')
          .query({ page: 0, perPage: 400, origin: 'USER' })
          .reply(RequestUtils.ACCESS_DENIED, { message: 'Access is denied.', errorCode: 'ACCESS_DENIED' });

        fieldController
          .diff()
          .then(() => {
            done('This function should not resolve');
          })
          .catch((err: any) => {
            assert.throws(() => {
              throw Error(err);
            }, '{\n  "message": "Access is denied.",\n  "errorCode": "ACCESS_DENIED"\n}');
            done();
          });
      });

      it('Should return the diff result', (done: MochaDone) => {
        scope = nock(UrlService.getDefaultUrl())
          // First expected request
          .get('/rest/organizations/dev/indexes/page/fields')
          .query({ page: 0, perPage: 400, origin: 'USER' })
          .reply(RequestUtils.OK, {
            items: [
              {
                name: 'allmetadatavalues',
                description: '',
                type: 'STRING'
              },
              {
                name: 'attachmentdepth',
                description: 'The attachment depth.',
                type: 'STRING'
              },
              {
                name: 'attachmentparentid',
                description: 'The identifier of the attachment"s immediate parent, for parent/child relationship.',
                type: 'LONG'
              }
            ],
            totalPages: 1,
            totalEntries: 3
          })
          // Second expected request
          .get('/rest/organizations/prod/indexes/page/fields')
          .query({ page: 0, perPage: 400, origin: 'USER' })
          .reply(RequestUtils.OK, {
            items: [
              {
                name: 'allmetadatavalues',
                description: 'new description',
                type: 'STRING'
              },
              {
                name: 'new field',
                description: 'The attachment depth.',
                type: 'STRING'
              }
            ],
            totalPages: 1,
            totalEntries: 2
          });

        fieldController
          .diff()
          .then(() => {
            expect(org1.getFields().getCount()).to.be.eql(3);
            expect(org2.getFields().getCount()).to.be.eql(2);
            done();
          })
          .catch((err: any) => {
            done(err);
          });
      });
    });

    describe('Graduate Method', () => {
      it('Should graduate fields', (done: MochaDone) => {
        scope = nock(UrlService.getDefaultUrl())
          .get('/rest/organizations/dev/indexes/page/fields')
          .query({ page: 0, perPage: 400, origin: 'USER' })
          .reply(RequestUtils.OK, {
            items: [
              {
                name: 'allmetadatavalues',
                description: '',
                type: 'STRING'
              },
              {
                name: 'attachmentdepth',
                description: 'The attachment depth.',
                type: 'STRING'
              },
              {
                name: 'newfield',
                description: 'new description',
                type: 'LONG'
              }
            ],
            totalPages: 1,
            totalEntries: 3
          })
          .get('/rest/organizations/prod/indexes/page/fields')
          .query({ page: 0, perPage: 400, origin: 'USER' })
          .reply(RequestUtils.OK, {
            items: [
              {
                name: 'allmetadatavalues',
                description: 'new description',
                type: 'STRING'
              },
              {
                name: 'attachmentdepth',
                description: 'The attachment depth.',
                type: 'STRING'
              },
              {
                name: 'attachmentparentid',
                description: 'The identifier of the attachment"s immediate parent, for parent/child relationship.',
                type: 'LONG'
              },
              {
                name: 'authorloginname',
                description: 'Login Name of the item author',
                type: 'STRING'
              }
            ],
            totalPages: 1,
            totalEntries: 2
          })
          .post('/rest/organizations/prod/indexes/fields/batch/create', [
            {
              name: 'newfield',
              description: 'new description',
              type: 'LONG'
            }
          ])
          .reply(RequestUtils.OK)
          .put('/rest/organizations/prod/indexes/fields/batch/update', [
            {
              name: 'allmetadatavalues',
              description: '',
              type: 'STRING'
            }
          ])
          .reply(RequestUtils.OK)
          .delete('/rest/organizations/prod/indexes/fields/batch/delete')
          .query({ fields: 'attachmentparentid,authorloginname' })
          .reply(RequestUtils.NO_CONTENT);

        const graduateOptions: IHTTPGraduateOptions = {
          POST: true,
          PUT: true,
          DELETE: true
        };

        fieldController
          .graduate(graduateOptions)
          .then(() => {
            done();
          })
          .catch((err: any) => {
            done(err);
          });
      });

      it('Should have nothing to graduate: Similar orgs', (done: MochaDone) => {
        scope = nock(UrlService.getDefaultUrl())
          .get('/rest/organizations/dev/indexes/page/fields')
          .query({ page: 0, perPage: 400, origin: 'USER' })
          .reply(RequestUtils.OK, {
            items: [
              {
                name: 'allmetadatavalues',
                description: '',
                type: 'STRING'
              },
              {
                name: 'attachmentdepth',
                description: 'The attachment depth.',
                type: 'STRING'
              },
              {
                name: 'newfield',
                description: 'new description',
                type: 'LONG'
              }
            ],
            totalPages: 1,
            totalEntries: 3
          })
          .get('/rest/organizations/prod/indexes/page/fields')
          .query({ page: 0, perPage: 400, origin: 'USER' })
          .reply(RequestUtils.OK, {
            items: [
              {
                name: 'allmetadatavalues',
                description: '',
                type: 'STRING'
              },
              {
                name: 'attachmentdepth',
                description: 'The attachment depth.',
                type: 'STRING'
              },
              {
                name: 'newfield',
                description: 'new description',
                type: 'LONG'
              }
            ],
            totalPages: 1,
            totalEntries: 3
          });

        const graduateOptions: IHTTPGraduateOptions = {
          POST: true,
          PUT: true,
          DELETE: true
        };

        fieldController
          .graduate(graduateOptions)
          .then((resolved: any[]) => {
            expect(resolved).to.be.empty;
            done();
          })
          .catch((err: any) => {
            done(err);
          });
      });

      it('Should graduate fields', (done: MochaDone) => {
        scope = nock(UrlService.getDefaultUrl())
          .get('/rest/organizations/dev/indexes/page/fields')
          .query({ page: 0, perPage: 400, origin: 'USER' })
          .reply(RequestUtils.OK, {
            items: [
              {
                name: 'allmetadatavalues',
                description: '',
                type: 'STRING'
              },
              {
                name: 'attachmentdepth',
                description: 'The attachment depth.',
                type: 'STRING'
              },
              {
                name: 'newfield',
                description: 'new description',
                type: 'LONG'
              }
            ],
            totalPages: 1,
            totalEntries: 3
          })
          .get('/rest/organizations/prod/indexes/page/fields')
          .query({ page: 0, perPage: 400, origin: 'USER' })
          .reply(RequestUtils.OK, {
            items: [
              {
                name: 'allmetadatavalues',
                description: 'new description',
                type: 'STRING'
              },
              {
                name: 'attachmentdepth',
                description: 'The attachment depth.',
                type: 'STRING'
              },
              {
                name: 'attachmentparentid',
                description: 'The identifier of the attachment"s immediate parent, for parent/child relationship.',
                type: 'LONG'
              },
              {
                name: 'authorloginname',
                description: 'Login Name of the item author',
                type: 'STRING'
              }
            ],
            totalPages: 1,
            totalEntries: 2
          });

        const graduateOptions: IHTTPGraduateOptions = {
          POST: false,
          PUT: false,
          DELETE: false
        };

        fieldController
          .graduate(graduateOptions)
          .then(() => {
            done();
          })
          .catch((err: any) => {
            done(err);
          });
      });
    });
  });
};
