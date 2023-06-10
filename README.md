# mongoose-id-validator2

This package is the typescript transformation of [mongoose-id-validator](https://github.com/CampbellSoftwareSolutions/mongoose-id-validator).

## Usage

Install via NPM

```sh
npm install mongoose-id-validator2
```

Then you can use the plugin on your schemas

```js
import mongooseIdValidator from 'mongoose-id-validator2';

const ManufacturerSchema = new Schema({
    name: String,
});
const Manufacturer = mongoose.model("Manufacturer", ManufacturerSchema);

const CarSchema = new Schema({
    name: String,
    manufacturer: {
        type: Schema.Types.ObjectId,
        ref: "Manufacturer",
        required: true,
    },
});

CarSchema.plugin(mongooseIdValidator);

const Car = mongoose.model("Car", CarSchema);

const ford = new ManufacturerSchema({ name: "Ford" });

ford.save(function () {
    const focus = new Car({ name: "Focus" });
    focus.manufacturer = "50136e40c78c4b9403000001";

    focus.validate(function (err) {
        //err.errors would contain a validation error for manufacturer with default message

        focus.manufacturer = ford;
        focus.validate(function (err) {
            //err will now be null as validation will pass
        });
    });
});
```

You may also use declare an optional refConditions method in your schema. For example:

```js
const OtherSchema = new Schema({
    referencedId: {
        type: Schema.Types.ObjectId,
        ref: "RefSchema",
        refConditions: {
            field1: 123,
        },
    },
});
```

Values of refConditions can also be functions. With this you can dynamically set refConditions.
These functions have access to the context of the schema instance. An example:

```js
const OtherSchema = new Schema({
    refFieldMustBeTrue: true,
    referencedId: {
        type: Schema.Types.ObjectId,
        ref: "RefSchema",
        refConditions: {
            field1: function () {
                return this.refFieldMustBeTrue;
            },
        },
    },
});
```

The referenceId value in the code above would only pass validation if the object with this ID exists AND had a property
'field1' that has the value 123. If any conditional property does not match then it would not pass validation.

You can also use this plugin to validate an array of ID references. Please note as above that the implementation
runs a single count query to keep the performance impact to a minimum. Hence you will know if there is a
bad ID value in the array of references but not which one it is.

An example of this is below:

```js
import mongooseIdValidator from 'mongoose-id-validator2';

const ColourSchema = new Schema({
    name: String,
});
const Colour = mongoose.model("Colour", ColourSchema);

const CarSchema = new Schema({
    name: String,
    colours: [
        {
            type: Schema.Types.ObjectId,
            ref: "Colour",
        },
    ],
});
CarSchema.plugin(mongooseIdValidator);
const Car = mongoose.model("Car", CarSchema);

const red = new Colour({ name: "Red" });
const blue = new Colour({ name: "Blue" });

red.save(function () {
    blue.save(function () {
        const focus = new Car({ name: "Focus" });
        focus.colours = [red, "50136e40c78c4b9403000001"];

        focus.validate(function (err) {
            //err.errors would contain a validation error for colours with default message

            focus.colours = [red, blue];
            focus.validate(function (err) {
                //err will now be null as validation will pass
            });
        });
    });
});
```

## Options

```js
Model.plugin(id - validator, {
    /* Custom validation message with {PATH} being replaced
     * with the relevant schema path that contains an invalid
     * document ID.
     */
    message: "Bad ID value for {PATH}",

    /* Optional mongoose connection object to use if you are
     * using multiple connections in your application.
     *
     * Defaults to built-in mongoose connection if not specified.
     */
    connection: myConnection,

    /* Applies to validation of arrays of ID references only. Set
     * to true if you sometimes have the same object ID reference
     * repeated in an array. If set, the validator will use the
     * total of unique ID references instead of total number of array
     * entries when checking the database.
     *
     * Defaults to false
     */
    allowDuplicates: true,
});
```

You can also instantiate the validator as an object if you wish to control whether it is enabled at runtime, e.g.
for testing.

```js
const IdValidator = require("mongoose-id-validator").getConstructor;

const validator = new IdValidator();
schema.plugin(validator.validate.bind(validator));

//Validation active by default. To disable:
validator.disable();

//Re-enable
validator.enable();
```

## Tests

To run the tests you need a local MongoDB instance available. Run with:

```sh
npm test
```

## Issues

Please use the GitHub issue tracker to raise any problems or feature requests.

If you would like to submit a pull request with any changes you make, please feel free!

## Legal

Code is Copyright (C) Campbell Software Solutions 2014 - 2017.

This module is available under terms of the LGPL V3 license. Hence you can use it in other proprietary projects
but any changes to the library should be made available.
