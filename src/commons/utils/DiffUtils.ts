import { extend, isEqual } from 'underscore';
import { IDiffOptions } from '../interfaces/IDiffOptions';
import { Dictionary } from '../collections/Dictionary';
import { DiffResultArray } from '../collections/DiffResultArray';
import { JsonUtils } from './JsonUtils';
import { ICoveoObject } from '../interfaces/ICoveoObject';

export class DiffUtils {
  static defaultOptions: IDiffOptions = {
    keysToIgnore: [],
    includeOnly: [],
  };

  /**
   * Return the differences between 2 dictionaries
   *
   * @template T
   * @param {Dictionary<T>} dict1 Initial dictionary
   * @param {Dictionary<T>} dict2Copy Final dictionary
   * @param {IDiffOptions} [diffOptions]
   * @returns {IDiffResultArray<T>} Result between dictionnaries
   */

  static getDiffResult<T extends ICoveoObject<T>>(
    dict1: Dictionary<T>,
    dict2: Dictionary<T>,
    diffOptions?: IDiffOptions
  ): DiffResultArray<T> {
    const options: IDiffOptions = extend({}, DiffUtils.defaultOptions, diffOptions);

    // Make sure we don't alter the initial Dictionaries
    const dict2Copy = dict2.clone();
    const dict1Copy = dict1.clone();

    const diffResult: DiffResultArray<T> = new DiffResultArray();

    dict1Copy.keys().forEach((key: string) => {
      const value: T = dict1Copy.getItem(key);
      const dict1CopyCleanedItem = JsonUtils.removeKeyValuePairsFromJson(
        value.getConfiguration(),
        options.keysToIgnore,
        options.includeOnly
      );

      if (dict2Copy.containsKey(key)) {
        const dict2CopyCleanedItem = JsonUtils.removeKeyValuePairsFromJson(
          dict2Copy.getItem(key).getConfiguration(),
          options.keysToIgnore,
          options.includeOnly
        );
        if (!isEqual(dict1CopyCleanedItem, dict2CopyCleanedItem)) {
          diffResult.TO_UPDATE.push(value);
          diffResult.TO_UPDATE_OLD.push(dict2Copy.getItem(key));
        }
      } else {
        diffResult.TO_CREATE.push(value);
      }

      dict2Copy.remove(key);
    });

    // Add the keys that were not in the first json to the deleted list
    dict2Copy.keys().forEach((key: string) => {
      diffResult.TO_DELETE.push(dict2Copy.getItem(key));
    });

    return diffResult;
  }
}
