// tslint:disable:no-magic-numbers
import { assert, expect } from 'chai';
import * as nock from 'nock';
import * as _ from 'underscore';
import { IGraduateOptions } from '../../src/commands/GraduateCommand';
import { DiffResultArray } from '../../src/commons/collections/DiffResultArray';
import { IGenericError } from '../../src/commons/errors';
import { UrlService } from '../../src/commons/rest/UrlService';
import { RequestUtils } from '../../src/commons/utils/RequestUtils';
import { Utils } from '../../src/commons/utils/Utils';
import { Field } from '../../src/coveoObjects/Field';
import { FieldController } from './../../src/controllers/FieldController';
import { Organization } from './../../src/coveoObjects/Organization';
import { IDiffOptions } from '../../src/commands/DiffCommand';

export const FieldControllerTest = () => {
  describe('Field Controller', () => {
    // Organizations
    const org1: Organization = new Organization('dev', 'xxx');
    const org2: Organization = new Organization('prod', 'yyy');

    // Fields
    const field1: Field = new Field({
      name: 'firstname',
      description: 'The first name of a person',
      type: 'STRING',
      includeInQuery: true
    });
    const field2: Field = new Field({
      name: 'birth',
      description: 'Day of birth',
      type: 'Date',
      includeInQuery: false
    });
    const field1WithSource: Field = new Field({
      name: 'firstname',
      description: 'The first name of a person',
      type: 'STRING',
      includeInQuery: true,
      sources: [{ name: 'source1', id: 'x001' }, { name: 'source2', id: 'x002' }]
    });
    const field2WithSource: Field = new Field({
      name: 'birth',
      description: 'Day of birth',
      type: 'Date',
      includeInQuery: false,
      sources: [{ name: 'source3', id: 'y003' }]
    });
    const field2Old: Field = new Field({
      name: 'birth',
      description: 'Birthday',
      type: 'Date',
      includeInQuery: true
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
        diffResultArray.TO_CREATE.push(field1WithSource);
        diffResultArray.TO_UPDATE.push(field2WithSource);
        diffResultArray.TO_UPDATE_OLD.push(field2Old);

        const diffOptions: IDiffOptions = {
          keysToIgnore: ['sources']
        };
        const cleanVersion = fieldController.getCleanVersion(diffResultArray, diffOptions);
        expect(cleanVersion).to.eql({
          summary: { TO_CREATE: 1, TO_UPDATE: 1, TO_DELETE: 0 },
          TO_CREATE: [
            {
              name: 'firstname',
              description: 'The first name of a person',
              type: 'STRING',
              includeInQuery: true,
              sources: ['source1', 'source2']
            }
          ],
          TO_UPDATE: [
            {
              name: 'birth',
              description: {
                newValue: 'Day of birth',
                oldValue: 'Birthday'
              },
              type: 'Date',
              includeInQuery: {
                newValue: false,
                oldValue: true
              },
              sources: ['source3']
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
          .get('/rest/organizations/dev/sources/page/fields')
          .query({ page: 0, perPage: 1000, origin: 'USER', includeMappings: false })
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
          .get('/rest/organizations/prod/sources/page/fields')
          .query({ page: 0, perPage: 1000, origin: 'USER', includeMappings: false })
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

      it('Should return an empty diff result - even if sources are different', (done: MochaDone) => {
        scope = nock(UrlService.getDefaultUrl())
          // First expected request
          .get('/rest/organizations/dev/sources/page/fields')
          .query({ page: 0, perPage: 1000, origin: 'USER', includeMappings: false })
          .reply(RequestUtils.OK, {
            items: [
              {
                name: 'allmetadatavalues',
                description: 'new description',
                type: 'STRING',
                sources: [{ name: 'source1', id: 'zxcv' }]
              },
              {
                name: 'new field',
                description: 'The attachment depth.',
                type: 'STRING',
                sources: [{ name: 'source1', id: 'zxcv' }, { name: 'source2', id: 'wert' }]
              }
            ]
          })
          .get('/rest/organizations/prod/sources/page/fields')
          .query({ page: 0, perPage: 1000, origin: 'USER', includeMappings: false })
          .reply(RequestUtils.OK, {
            items: [
              {
                name: 'allmetadatavalues',
                description: 'new description',
                type: 'STRING',
                sources: []
              },
              {
                name: 'new field',
                description: 'The attachment depth.',
                type: 'STRING',
                sources: [{ name: 'source1', id: 'zxcv-prod' }, { name: 'source2', id: 'wert-prod' }]
              }
            ]
          });

        const diffOptions: IDiffOptions = {
          keysToIgnore: ['sources']
        };
        fieldController
          .diff(diffOptions)
          .then((diff: DiffResultArray<Field>) => {
            expect(diff.containsItems()).to.be.false;
            done();
          })
          .catch((err: any) => {
            done(err);
          });
      });

      it('Should return fields for specified sources', (done: MochaDone) => {
        scope = nock(UrlService.getDefaultUrl())
          // First expected request
          .get('/rest/organizations/dev/sources/page/fields')
          .query({ page: 0, perPage: 1000, origin: 'USER', includeMappings: false })
          .reply(RequestUtils.OK, {
            items: [
              {
                // we don't want to diff this field
                name: 'genericfield',
                description: '',
                type: 'STRING',
                sources: []
              },
              {
                // we don't want to diff this field
                name: 'field1',
                description: 'new description',
                type: 'STRING',
                sources: [{ name: 'source1', id: 'zxcv' }]
              },
              {
                name: 'field2',
                description: 'new description',
                type: 'STRING',
                sources: [{ name: 'source1', id: 'zxcv' }, { name: 'source2', id: 'wert' }]
              },
              {
                name: 'field3',
                description: 'should upadte this field event if sources attribute is different.',
                type: 'STRING',
                sources: [{ name: 'source3', id: 'asdfg' }, { name: 'source2', id: 'wert' }]
              },
              {
                // we don't want to diff this field
                name: 'newfield',
                description: 'new field to create.',
                type: 'STRING',
                sources: [{ name: 'source3', id: 'jgfdk' }, { name: 'source6', id: 'fosjd' }]
              }
            ]
          })
          .get('/rest/organizations/prod/sources/page/fields')
          .query({ page: 0, perPage: 1000, origin: 'USER', includeMappings: false })
          .reply(RequestUtils.OK, {
            items: [
              {
                name: 'genericfield',
                description: 'changed description',
                type: 'STRING',
                sources: []
              },
              {
                name: 'field1',
                description: 'old description',
                type: 'STRING',
                sources: [{ name: 'source1', id: 'zxcv-prod' }]
              },
              {
                name: 'field2',
                description: '',
                type: 'STRING',
                sources: [{ name: 'source1', id: 'zxcv-prod' }, { name: 'source2', id: 'wert-prod' }]
              },
              {
                name: 'field3',
                description: '',
                type: 'STRING',
                sources: [{ name: 'sourceX', id: 'asdfg' }, { name: 'sourceY', id: 'wert' }]
              },
              {
                name: 'fieldtodelete',
                description: '',
                type: 'STRING',
                sources: [{ name: 'source2', id: 'asdfg' }, { name: 'sourceY', id: 'wert' }]
              }
            ]
          });

        const diffOptions: IDiffOptions = {
          keysToIgnore: ['sources'],
          sources: ['source2', 'source3']
        };
        fieldController
          .diff(diffOptions)
          .then((diff: DiffResultArray<Field>) => {
            expect(diff.TO_UPDATE.length).to.eql(2);
            expect(_.map(diff.TO_UPDATE, f => f.getName())).to.contain('field2');
            expect(_.map(diff.TO_UPDATE, f => f.getName())).to.contain('field3');
            expect(diff.TO_CREATE.length).to.eql(1);
            expect(diff.TO_DELETE.length).to.eql(1);
            done();
          })
          .catch((err: any) => {
            done(err);
          });
      });

      it('Should not return the diff result', (done: MochaDone) => {
        scope = nock(UrlService.getDefaultUrl())
          // First expected request
          .get('/rest/organizations/dev/sources/page/fields')
          .query({ page: 0, perPage: 1000, origin: 'USER', includeMappings: false })
          .reply(RequestUtils.ACCESS_DENIED, { message: 'Access is denied.', errorCode: 'ACCESS_DENIED' })
          .get('/rest/organizations/prod/sources/page/fields')
          .query({ page: 0, perPage: 1000, origin: 'USER', includeMappings: false })
          .reply(RequestUtils.ACCESS_DENIED, { message: 'Access is denied.', errorCode: 'ACCESS_DENIED' });

        fieldController
          .diff()
          .then(() => {
            done('This function should not resolve');
          })
          .catch((err: IGenericError) => {
            assert.throws(() => {
              throw Error(err.message);
            }, '{\n  "message": "Access is denied.",\n  "errorCode": "ACCESS_DENIED"\n}');
            done();
          });
      });

      it('Should return the diff result', (done: MochaDone) => {
        scope = nock(UrlService.getDefaultUrl())
          // First expected request
          .get('/rest/organizations/dev/sources/page/fields')
          .query({ page: 0, perPage: 1000, origin: 'USER', includeMappings: false })
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
          .get('/rest/organizations/prod/sources/page/fields')
          .query({ page: 0, perPage: 1000, origin: 'USER', includeMappings: false })
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
      it('Should graduate fields (POST, PUT, DELETE)', (done: MochaDone) => {
        scope = nock(UrlService.getDefaultUrl())
          .get('/rest/organizations/dev/sources/page/fields')
          .query({ page: 0, perPage: 1000, origin: 'USER', includeMappings: false })
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
          .get('/rest/organizations/prod/sources/page/fields')
          .query({ page: 0, perPage: 1000, origin: 'USER', includeMappings: false })
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
          .reply(RequestUtils.NO_CONTENT)
          .delete('/rest/organizations/prod/indexes/fields/batch/delete')
          .query({ fields: 'attachmentparentid,authorloginname' })
          .reply(RequestUtils.NO_CONTENT);

        const graduateOptions: IGraduateOptions = {
          POST: true,
          PUT: true,
          DELETE: true,
          diffOptions: {}
        };

        fieldController
          .diff()
          .then((diffResultArray: DiffResultArray<Field>) => {
            fieldController
              .graduate(diffResultArray, graduateOptions)
              .then(() => {
                done();
              })
              .catch((err: any) => {
                done(err);
              });
          })
          .catch((err: any) => {
            done(err);
          });
      });

      it('Should not graduate fields: Graduation error', (done: MochaDone) => {
        scope = nock(UrlService.getDefaultUrl())
          .get('/rest/organizations/dev/sources/page/fields')
          .query({ page: 0, perPage: 1000, origin: 'USER', includeMappings: false })
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
          .get('/rest/organizations/prod/sources/page/fields')
          .query({ page: 0, perPage: 1000, origin: 'USER', includeMappings: false })
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
          .reply(RequestUtils.ACCESS_DENIED, 'not today')
          .put('/rest/organizations/prod/indexes/fields/batch/update', [
            {
              name: 'allmetadatavalues',
              description: '',
              type: 'STRING'
            }
          ])
          .reply(RequestUtils.ACCESS_DENIED, 'very sorry')
          .delete('/rest/organizations/prod/indexes/fields/batch/delete')
          .query({ fields: 'attachmentparentid,authorloginname' })
          .reply(RequestUtils.ACCESS_DENIED, 'stop that');

        const graduateOptions: IGraduateOptions = {
          POST: true,
          PUT: true,
          DELETE: true,
          diffOptions: {}
        };

        fieldController
          .diff()
          .then((diffResultArray: DiffResultArray<Field>) => {
            fieldController.graduate(diffResultArray, graduateOptions);
            done();
          })
          .catch((err: any) => {
            done(err);
          })
          .catch((err: any) => {
            done(err);
          });
      });

      it('Should have nothing to graduate: Similar orgs', (done: MochaDone) => {
        scope = nock(UrlService.getDefaultUrl())
          .get('/rest/organizations/dev/sources/page/fields')
          .query({ page: 0, perPage: 1000, origin: 'USER', includeMappings: false })
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
          .get('/rest/organizations/prod/sources/page/fields')
          .query({ page: 0, perPage: 1000, origin: 'USER', includeMappings: false })
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

        const graduateOptions: IGraduateOptions = {
          POST: true,
          PUT: true,
          DELETE: true,
          diffOptions: {}
        };

        fieldController.diff().then((diffResultArray: DiffResultArray<Field>) => {
          fieldController
            .graduate(diffResultArray, graduateOptions)
            .then((resolved: any[]) => {
              expect(resolved).to.be.empty;
              done();
            })
            .catch((err: any) => {
              done(err);
            })
            .catch((err: any) => {
              done(err);
            });
        });
      });

      it('Should not graduate: failed diff', (done: MochaDone) => {
        scope = nock(UrlService.getDefaultUrl())
          .get('/rest/organizations/dev/sources/page/fields')
          .query({ page: 0, perPage: 1000, origin: 'USER', includeMappings: false })
          .reply(RequestUtils.ACCESS_DENIED, 'some message')
          .get('/rest/organizations/prod/sources/page/fields')
          .query({ page: 0, perPage: 1000, origin: 'USER', includeMappings: false })
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

        const graduateOptions: IGraduateOptions = {
          POST: true,
          PUT: true,
          DELETE: true,
          diffOptions: {}
        };

        fieldController
          .diff()
          .then((diffResultArray: DiffResultArray<Field>) => {
            fieldController
              .graduate(diffResultArray, graduateOptions)
              .then((resolved: any[]) => {
                done('This function should not resolve');
              })
              .catch((err: any) => {
                done(err);
              });
          })
          .catch((err: IGenericError) => {
            assert.throws(() => {
              throw Error(err.message);
            }, 'some message');
            nock.cleanAll();
            done();
          });
      });

      it('Should have nothing to graduate: No HTTP verbe selected', (done: MochaDone) => {
        scope = nock(UrlService.getDefaultUrl())
          .get('/rest/organizations/dev/sources/page/fields')
          .query({ page: 0, perPage: 1000, origin: 'USER', includeMappings: false })
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
          .get('/rest/organizations/prod/sources/page/fields')
          .query({ page: 0, perPage: 1000, origin: 'USER', includeMappings: false })
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

        const graduateOptions: IGraduateOptions = {
          POST: false,
          PUT: false,
          DELETE: false,
          diffOptions: {}
        };

        fieldController.diff().then((diffResultArray: DiffResultArray<Field>) => {
          fieldController
            .graduate(diffResultArray, graduateOptions)
            .then(() => {
              done();
            })
            .catch((err: any) => {
              done(err);
            });
        });
      });
    });

    describe('Download Method', () => {
      it('Should return an empty diff result', (done: MochaDone) => {
        scope = nock(UrlService.getDefaultUrl())
          .get('/rest/organizations/dev/sources/page/fields')
          .query({ page: 0, perPage: 1000, origin: 'USER', includeMappings: false })
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
          });

        fieldController
          .download(org1.getId())
          .then(() => {
            expect(org1.getFields().getCount()).to.be.eql(3);
            done();
          })
          .catch((err: any) => {
            done(err);
          });
      });
    });
  });
};
