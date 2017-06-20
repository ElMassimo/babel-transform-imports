import assert from 'assert';
import * as babel from 'babel-core';
import path from 'path';

function createOptions({
    preventFullImport = false,
    transform = 'react-bootstrap/lib/${member}',
    camelCase = false,
    kebabCase = false,
    snakeCase = false,
    skipDefaultConversion = false,
    libraryName = 'react-bootstrap'
}) {
    return {
        [libraryName]: { transform, preventFullImport, camelCase, kebabCase, snakeCase, skipDefaultConversion }
    };
};

const fullImportRegex = /require\('react-bootstrap'\);$/gm;
const memberImportRegex = /require\('react-bootstrap\/lib\/.+'\);$/gm;

function occurrences(regex, test) {
    return (test.match(regex) || []).length;
}

function transform(code, options = createOptions({})) {
    return babel.transform(code, {
        presets: ['es2015'],
        plugins: [['./index', options]]
    }).code;
}

describe('import transformations', function() {
    it('should handle default imports', function() {
        let code = transform(`import Bootstrap from 'react-bootstrap';`);

        assert.equal(occurrences(fullImportRegex, code), 1, 'number of full imports should be 1');
        assert.equal(occurrences(memberImportRegex, code), 0, 'number of member imports should be 0');
    });

    it('should handle namespace imports', function() {
        let code = transform(`import * as Bootstrap from 'react-bootstrap';`);

        assert.equal(occurrences(fullImportRegex, code), 1, 'number of full imports should be 1');
        assert.equal(occurrences(memberImportRegex, code), 0, 'number of member imports should be 0');
    });

    it('should handle member imports', function() {
        let code = transform(`import { Grid, Row as row } from 'react-bootstrap';`);

        assert.equal(occurrences(fullImportRegex, code), 0, 'number of full imports should be 0');
        assert.equal(occurrences(memberImportRegex, code), 2, 'number of member imports should be 2');
    });

    it('should handle a mix of member and default import styles', function() {
        let code = transform(`import Bootstrap, { Grid, Row as row } from 'react-bootstrap';`);

        assert.equal(occurrences(fullImportRegex, code), 1, 'number of full imports should be 1');
        assert.equal(occurrences(memberImportRegex, code), 2, 'number of member imports should be 2');
    });

    it('should handle relative filenames', function() {
        const libraryName = path.join(__dirname, '../local/path');
        const _transform = path.join(__dirname, '../local/path/${member}');
        const options = createOptions({ libraryName, transform: _transform })
        const code = transform(`import { LocalThing } from './local/path'`, options);

        assert.equal(/require\('.*LocalThing'\);$/m.test(code), true, 'LocalThing should be directly required');
    });
});

describe('camelCase plugin option', function() {
    it('should use camel casing when set', function() {
        let options = createOptions({ camelCase: true });

        let code = transform(`import { CamelMe } from 'react-bootstrap';`, options);

        assert.notEqual(code.indexOf('camelMe'), -1, 'member name CamelMe should be transformed to camelMe');
    });
});

describe('kebabCase plugin option', function() {
    it('should use kebab casing when set', function() {
        let options = createOptions({ kebabCase: true });

        let code = transform(`import { KebabMe } from 'react-bootstrap';`, options);

        assert.notEqual(code.indexOf('kebab-me'), -1, 'member name KababMe should be transformed to kebab-me');
    });
});

describe('snakeCase plugin option', function() {
    it('should use snake casing when set', function() {
        let options = createOptions({ snakeCase: true });

        let code = transform(`import { SnakeMe } from 'react-bootstrap';`, options);

        assert.notEqual(code.indexOf('snake_me'), -1, 'member name SnakeMe should be transformed to snake_me');
    });
});

describe('transform as function', function() {
    it('should throw when provided filename is invalid', function() {
        let options = createOptions({ transform: 'missingFile.js' });

        assert.throws(() => {transform(`import { Row } from 'react-bootstrap';`, options)});
    });

    it('should throw when provided filename does not resolve to a function', function() {
        let options = createOptions({ transform: './test/invalidTransform.js' });

        assert.throws(() => {transform(`import { Row } from 'react-bootstrap';`, options)});
    });

    it('should properly execute transform function when provided', function() {
        let options = createOptions({ transform: './test/transform.js' });

        let code = transform(`import { upperCaseMe } from 'react-bootstrap';`, options);

        assert.notEqual(code.indexOf('UPPERCASEME'), -1, 'member name upperCaseMe should be transformed to UPPERCASEME');
    });

    it('should call the transform as a function when provided as so', function() {
        let options = createOptions({ transform: function(input) { return `path/${input}`; } });

        let code = transform(`import { somePath } from 'react-bootstrap';`, options);

        assert.notEqual(code.indexOf('path/somePath'), -1, 'function should transform somePath to path/somePath');
    });
});

describe('preventFullImport plugin option', function() {
    it('should throw on default imports when truthy', function() {
        let options = createOptions({ preventFullImport: true });

        assert.throws(() => {transform(`import Bootstrap from 'react-bootstrap';`, options)});
    });

    it('should throw on namespace imports when truthy', function() {
        let options = createOptions({ preventFullImport: true });

        assert.throws(() => {transform(`import * as Bootstrap from 'react-bootstrap';`, options)});
    });

    it('should not throw on member imports when truthy', function() {
        let options = createOptions({ preventFullImport: true });

        assert.doesNotThrow(() => {transform(`import { Grid, Row as row } from 'react-bootstrap';`, options)});
    });
});

describe('skipDefaultConversion plugin option', function() {
    it('should retain named import syntax when enabled', function() {
        let options = createOptions({ skipDefaultConversion: true });

        let code = transform(`import { Grid, Row as row } from 'react-bootstrap';`, options);

        assert.equal(code.indexOf('_interopRequireDefault'), -1, 'skipDefaultConversion should not allow conversion to default import');
    })
});

describe('edge cases', function() {
    it('should throw when transform plugin option is missing', function() {
        let options = createOptions({ transform: null });

        assert.throws(() => {transform(`import Bootstrap from 'react-bootstrap';`, options)});
    });
});
