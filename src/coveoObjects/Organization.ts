import { contains, each } from 'underscore';
import { Dictionary } from '../commons/collections/Dictionary';
import { IStringMap } from '../commons/interfaces/IStringMap';
import { Assert } from '../commons/misc/Assert';
import { BaseCoveoObject } from './BaseCoveoObject';
import { Extension } from './Extension';
import { Field } from './Field';
import { Source } from './Source';
import { StringUtil } from '../commons/utils/StringUtils';
import { Page } from './Page';
import { ICoveoObject } from '../commons/interfaces/ICoveoObject';
import { EnvironmentUtils } from '../commons/utils/EnvironmentUtils';

export interface IOrganization extends ICoveoObject<Organization> {
  getApiKey(): string;
  getFields(): Dictionary<Field>;
  getSources(): Dictionary<Source>;
  getExtensions(): Dictionary<Extension>;
}

// Blacklist all the objects that we do not want to add to the organization.
export interface IBlacklistObjects {
  fields?: string[];
  extensions?: string[];
  sources?: string[];
  pages?: string[];
}

export interface IOrganizationOptions {
  platformUrl?: string;
  blacklist?: IBlacklistObjects;
}

/**
 * Organization Class. By default, the organization instance do not contain any field, sources nor extension.
 * This is a way to prevent unecessary HTTP calls to the platform.
 * The Controllers are responsible to load those
 */
export class Organization extends BaseCoveoObject implements IOrganization {
  private fields: Dictionary<Field> = new Dictionary<Field>();
  private sources: Dictionary<Source> = new Dictionary<Source>();
  private extensions: Dictionary<Extension> = new Dictionary<Extension>();
  private pages: Dictionary<Page> = new Dictionary<Page>();
  private blacklist: IBlacklistObjects = {};

  constructor(id: string, private apiKey: string, private options: IOrganizationOptions = {}) {
    super(id);
    Assert.exists(id, 'Missing organization id');
    this.apiKey = apiKey;

    // Setup options
    this.blacklist = options.blacklist || {};

    this.blacklist.extensions = (this.blacklist.extensions || []).map((e) => StringUtil.lowerAndStripSpaces(e));
    this.blacklist.fields = (this.blacklist.fields || []).map((f) => StringUtil.lowerAndStripSpaces(f));
    this.blacklist.sources = (this.blacklist.sources || []).map((s) => StringUtil.lowerAndStripSpaces(s));
    this.blacklist.pages = (this.blacklist.pages || []).map((p) => StringUtil.lowerAndStripSpaces(p));
  }

  getExtensionBlacklist(): string[] {
    return this.blacklist.extensions || [];
  }

  getPageBlacklist(): string[] {
    return this.blacklist.pages || [];
  }

  getfieldBlacklist(): string[] {
    return this.blacklist.fields || [];
  }

  getSourceBlacklist(): string[] {
    return this.blacklist.sources || [];
  }

  /**
   * Return the API key used for the manipulation on the Organization.
   *
   * @returns {string} API Key
   */
  getApiKey(): string {
    return this.apiKey || '';
  }

  /**
   * Return a copy of the Organizatio fields
   *
   * @returns {Dictionary<Field>}
   */
  getFields(): Dictionary<Field> {
    return this.fields.clone();
  }

  /**
   * Add a new field to the Organzation
   *
   * @param {Field} field Field to be added
   */
  addField(field: Field) {
    if (!contains(this.getfieldBlacklist(), StringUtil.lowerAndStripSpaces(field.getName()))) {
      this.fields.add(field.getName(), field);
    }
  }

  /**
   * Takes a field list and, for each item of the list, create a field that will be added to the Organization
   *
   * @param {IStringMap<any>[]} fields field list
   */
  addFieldList(fields: Array<IStringMap<any>>) {
    fields.forEach((f: IStringMap<any>) => {
      const field = new Field(f);
      this.addField(field);
    });
  }

  /**
   * Takes a page list and, for each item of the list, create a page that will be added to the Organization
   *
   * @param {IStringMap<any>[]} pages page list
   */
  addPageList(pages: Array<IStringMap<any>>) {
    pages.forEach((p: IStringMap<any>) => {
      const page = new Page(p);
      this.addPage(page);
    });
  }

  clearFields() {
    this.fields.clear();
  }

  getSources(): Dictionary<Source> {
    return this.sources.clone();
  }

  /**
   * Add a soucre to the Organization
   *
   * @param {Source} source Source to be added
   */
  addSource(source: Source) {
    // Using the source name as the key since the source ID is not the same from on org to another
    Assert.isUndefined(this.sources.getItem(source.getName()), `At least 2 sources are having the same name: ${source.getName()}`);
    if (!contains(this.getSourceBlacklist() || [], StringUtil.lowerAndStripSpaces(source.getName()))) {
      this.sources.add(source.getName(), source);
    }
  }

  /**
   * Takes a source list and, for each item of the list, create a source that will be added to the Organization
   *
   * @param {IStringMap<any>[]} sources source list
   */
  addSourceList(sources: Array<IStringMap<any>>) {
    sources.forEach((s: IStringMap<any>) => {
      const source = new Source(s);
      this.addSource(source);
    });
  }

  /**
   * Takes a etension list and, for each item of the list, create a etension that will be added to the Organization
   *
   * @param {IStringMap<any>[]} extensions extension list
   */
  addExtensionList(extensions: Array<IStringMap<any>>) {
    extensions.forEach((e: IStringMap<any>) => {
      const extension = new Extension(e);
      this.addExtension(extension);
    });
  }

  clearSources() {
    this.sources.clear();
  }

  getExtensions(): Dictionary<Extension> {
    return this.extensions.clone();
  }

  getPlatformUrl(): string {
    return this.options.platformUrl ?? EnvironmentUtils.getDefaultEnvironment();
  }

  getPages(): Dictionary<Page> {
    return this.pages.clone();
  }

  /**
   * Add an page to the Organization
   *
   * @param {Page} page Page to be added
   */
  addPage(page: Page) {
    // Using the page name as the key since the page ID is not the same from on org to another
    Assert.isUndefined(this.pages.getItem(page.getName()), `At least 2 pages are having the same name: ${page.getName()}`);
    if (!contains(this.getPageBlacklist() || [], StringUtil.lowerAndStripSpaces(page.getName()))) {
      this.pages.add(page.getName(), page);
    }
  }

  /**
   * Add an extension to the Organization
   *
   * @param {Extension} extension Extension to be added
   */
  addExtension(extension: Extension) {
    // Using the extension name as the key since the extension ID is not the same from on org to another
    Assert.isUndefined(
      this.extensions.getItem(extension.getName()),
      `At least 2 extensions are having the same name: ${extension.getName()}`
    );
    if (!contains(this.getExtensionBlacklist() || [], StringUtil.lowerAndStripSpaces(extension.getName()))) {
      this.extensions.add(extension.getName(), extension);
    }
  }

  /**
   * Takes an extension list and, for each item of the list, create an extention that will be added to the Organization
   *
   * @param {IStringMap<any>[]} extensions
   */
  addMultipleExtensions(extensions: Array<IStringMap<any>>) {
    extensions.forEach((e: IStringMap<any>) => {
      const extension = new Extension(e);
      this.addExtension(extension);
    });
  }

  clearExtensions() {
    this.extensions.clear();
  }

  clearPages() {
    this.pages.clear();
  }

  clearAll() {
    this.clearExtensions();
    this.clearFields();
    this.clearSources();
  }

  getConfiguration(): IStringMap<Dictionary<Source | Field | Extension>> {
    return {
      fields: this.getFields(),
      sources: this.getSources(),
      extensions: this.getExtensions(),
    };
  }

  clone() {
    const newOrg = new Organization(this.getId(), this.getApiKey(), JSON.parse(JSON.stringify(this.options)));
    each(this.fields.values(), (field: Field) => {
      newOrg.addField(field.clone());
    });
    each(this.extensions.values(), (extension: Extension) => {
      newOrg.addExtension(extension.clone());
    });
    each(this.sources.values(), (source: Source) => {
      newOrg.addSource(source.clone());
    });

    return newOrg;
  }
}
