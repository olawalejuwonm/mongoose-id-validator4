"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const __1 = __importDefault(require(".."));
const async_1 = __importDefault(require("async"));
const should_1 = __importDefault(require("should"));
const __2 = require("..");
const Schema = mongoose_1.default.Schema;
let url = "mongodb://localhost:27017/mongoose-id-validator";
if (process.env.MONGO_PORT_27017_TCP_PORT) {
    url =
        "mongodb://" +
            process.env.MONGO_PORT_27017_TCP_ADDR +
            ":" +
            process.env.MONGO_PORT_27017_TCP_PORT +
            "/mongoose-id-validator";
}
let connection2;
function validatorConcept(schema) {
    const idvalidator = new __2.getConstructor();
    schema.plugin(__2.getConstructor.prototype.validate.bind(idvalidator));
    schema.statics.enableValidation = function () {
        idvalidator.enable();
    };
    schema.statics.disableValidation = function () {
        idvalidator.disable();
    };
}
before(function (done) {
    mongoose_1.default.connect(url, done);
    connection2 = mongoose_1.default.createConnection(url + "2");
});
describe("mongoose-id-validator Integration Tests", function () {
    const ManufacturerSchema = new Schema({
        name: String,
    });
    const Manufacturer = mongoose_1.default.model("Manufacturer", ManufacturerSchema);
    const ColourSchema = new Schema({
        name: String,
    });
    const Colour = mongoose_1.default.model("Colour", ColourSchema);
    let colours = {};
    const saveColours = [];
    "red green black blue silver".split(" ").forEach(function (c) {
        saveColours.push(function (cb) {
            const newColour = new Colour({
                name: c,
            });
            colours[c] = newColour;
            newColour.save(cb);
        });
    });
    const CarSchema = new Schema({
        name: String,
        manufacturer: {
            type: Schema.Types.ObjectId,
            ref: "Manufacturer",
        },
        colours: [
            {
                type: Schema.Types.ObjectId,
                ref: "Colour",
            },
        ],
    });
    CarSchema.plugin(__1.default, {
        message: "{PATH} ID is bad",
    });
    const Car = mongoose_1.default.model("Car", CarSchema);
    const BikeSchema = new Schema({
        name: String,
        manufacturer: {
            type: Schema.Types.ObjectId,
            ref: "Manufacturer",
        },
        colours: [
            {
                type: Schema.Types.ObjectId,
                ref: "Colour",
            },
        ],
    });
    validatorConcept(BikeSchema);
    const Bike = mongoose_1.default.model("Bike", BikeSchema);
    beforeEach(function (done) {
        async_1.default.parallel([
            Manufacturer.deleteMany.bind(Manufacturer),
            Colour.deleteMany.bind(Colour),
            Car.deleteMany.bind(Car),
            Bike.deleteMany.bind(Bike),
        ], function (err) {
            if (err) {
                return done(err);
            }
            colours = [];
            async_1.default.parallel(saveColours, done);
        });
    });
    it("Should allow no manufacturer/colour IDs as developer can use " +
        "mongoose required option to make these mandatory", function (done) {
        const c = new Car({
            name: "Test Car",
        });
        c.save(done);
    });
    it("Should pass validation with explicit null ID", function (done) {
        const c = new Car({
            name: "Test Car",
            manufacturer: null,
        });
        c.validate(done);
    });
    it("Should pass validation with explicit undefined ID", function (done) {
        const c = new Car({
            name: "Test Car",
            manufacturer: undefined,
        });
        c.validate(done);
    });
    it("Should pass validation with explicit null array", function (done) {
        const c = new Car({
            name: "Test Car",
            colours: null,
        });
        c.save(done);
    });
    it("Should pass validation with explicit undefined array", function (done) {
        const c = new Car({
            name: "Test Car",
            colours: undefined,
        });
        c.save(done);
    });
    it("Should pass validation with existing ID", function (done) {
        const m = new Manufacturer({
            name: "Car Maker",
        });
        const c = new Car({
            name: "Test Car",
            manufacturer: m,
        });
        async_1.default.series([m.save.bind(m), c.save.bind(c)], done);
    });
    it("Should fail validation with custom message on bad ID", function (done) {
        const c = new Car({
            name: "Test Car",
            manufacturer: "50136e40c78c4b9403000001",
        });
        c.validate(function (err) {
            err.name.should.eql("ValidationError");
            err.errors.manufacturer.message.should.eql("manufacturer ID is bad");
            done();
        });
    });
    it("Should fail validation on bad ID with IdValidator instance", function (done) {
        const b = new Bike({
            name: "Test Bike",
            manufacturer: "50136e40c78c4b9403000001",
        });
        b.validate(function (err) {
            err.name.should.eql("ValidationError");
            err.errors.manufacturer.message.should.eql("manufacturer references a non existing ID");
            done();
        });
    });
    it("Should ignore validation when it is disabled", function (done) {
        Bike.disableValidation();
        const b = new Bike({
            name: "Test Bike",
            manufacturer: "50136e40c78c4b9403000001",
        });
        b.save(done);
    });
    it("Should fail validation if bad ID set after previously good ID value", function (done) {
        let savePassed = false;
        const m = new Manufacturer({
            name: "Car Maker",
        });
        const c = new Car({
            name: "Test Car",
            manufacturer: m,
        });
        async_1.default.series([
            m.save.bind(m),
            c.save.bind(c),
            function (cb) {
                savePassed = true;
                c.manufacturer = "50136e40c78c4b9403000001";
                c.save(cb);
            },
        ], function (err) {
            (0, should_1.default)(savePassed).be.ok;
            err.name.should.eql("ValidationError");
            err.errors.manufacturer.message.should.eql("manufacturer ID is bad");
            done();
        });
    });
    it("Should pass validation if no ID value changed (even when manufacturer subsequently removed)", function (done) {
        const m = new Manufacturer({
            name: "Car Maker",
        });
        const c = new Car({
            name: "Test Car",
            manufacturer: m,
        });
        async_1.default.series([
            m.save.bind(m),
            c.save.bind(c),
            Manufacturer.deleteMany.bind(Manufacturer),
            c.save.bind(c),
        ], done);
    });
    it("Should validate correctly IDs in an array of ID references", function (done) {
        const c = new Car({
            name: "Test Car",
            colours: [colours["red"], colours["blue"], colours["black"]],
        });
        c.save(done);
    });
    it("Should fail ID validation in an array of ID references", function (done) {
        const c = new Car({
            name: "Test Car",
            colours: [colours["red"], "50136e40c78c4b9403000001", colours["black"]],
        });
        c.save(function (err) {
            err.name.should.eql("ValidationError");
            err.errors.colours.message.should.eql("colours ID is bad");
            done();
        });
    });
    it("Array of ID values should pass validation if not modified since last save", function (done) {
        const c = new Car({
            type: Schema.Types.ObjectId,
            colours: [colours["red"], colours["blue"], colours["black"]],
        });
        async_1.default.series([
            c.save.bind(c),
            function (cb) {
                colours["blue"].remove(cb);
            },
            c.validate.bind(c),
        ], done);
    });
    it("Should not trigger ref validation if path not modified", function (done) {
        const m = new Manufacturer({});
        const c = new Car({
            manufacturer: m._id,
            name: "c",
        });
        let called = 0;
        const tmp = Manufacturer.countDocuments;
        Manufacturer.countDocuments = function () {
            called++;
            return tmp.apply(this, arguments);
        };
        async_1.default.waterfall([
            function (cb) {
                m.save(cb);
            },
            function (_, cb) {
                c.save(cb);
            },
            function (_, cb) {
                Car.findById(c._id, cb);
            },
            function (c, cb) {
                c.name = "d";
                c.validate(cb); //must not trigger a count as manufacturerId not modified
            },
            function (cb) {
                (0, should_1.default)(called).be.equal(1);
                cb(null);
            },
        ], function (err) {
            Manufacturer.countDocuments = tmp;
            done(err);
        });
    });
    describe("refConditions tests", function () {
        const PersonSchema = new Schema({
            name: String,
            gender: {
                type: String,
                enum: ["m", "f"],
            },
        });
        const Person = mongoose_1.default.model("Person", PersonSchema);
        const InfoSchema = new Schema({
            bestMaleFriend: {
                type: Schema.Types.ObjectId,
                ref: "Person",
                refConditions: {
                    gender: "m",
                },
            },
            femaleFriends: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "Person",
                    refConditions: {
                        gender: "f",
                    },
                },
            ],
        });
        InfoSchema.plugin(__1.default);
        const Info = mongoose_1.default.model("Info", InfoSchema);
        const jack = new Person({ name: "Jack", gender: "m" });
        const jill = new Person({ name: "Jill", gender: "f" });
        const ann = new Person({ name: "Ann", gender: "f" });
        before(function (done) {
            async_1.default.series([
                Person.deleteMany.bind(Person),
                Info.deleteMany.bind(Info),
                jack.save.bind(jack),
                jill.save.bind(jill),
                ann.save.bind(ann),
            ], done);
        });
        it("Should validate with single ID value that matches condition", function (done) {
            const i = new Info({ bestMaleFriend: jack });
            i.validate(done);
        });
        it("Should fail to validate single ID value that exists but does not match conditions", function (done) {
            const i = new Info({ bestMaleFriend: jill });
            i.validate(function (err) {
                err.should.property("name", "ValidationError");
                err.errors.should.property("bestMaleFriend");
                done();
            });
        });
        it("Should validate array of ID values that match conditions", function (done) {
            const i = new Info({ femaleFriends: [ann, jill] });
            i.validate(done);
        });
        it("Should not validate array of ID values containing value that exists but does not match conditions", function (done) {
            const i = new Info({ femaleFriends: [jill, jack] });
            i.validate(function (err) {
                err.should.property("name", "ValidationError");
                err.errors.should.property("femaleFriends");
                done();
            });
        });
    });
    describe("refConditions with function tests", function () {
        const PeopleSchema = new Schema({
            name: String,
            gender: {
                type: String,
                enum: ["m", "f"],
            },
        });
        const People = mongoose_1.default.model("People", PeopleSchema);
        const FriendSchema = new Schema({
            mustBeFemale: Boolean,
            bestFriend: {
                type: Schema.Types.ObjectId,
                ref: "People",
                refConditions: {
                    gender: function () {
                        return this.mustBeFemale ? "f" : "m";
                    },
                },
            },
            friends: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "People",
                    refConditions: {
                        gender: function () {
                            return this.mustBeFemale ? "f" : "m";
                        },
                    },
                },
            ],
        });
        FriendSchema.plugin(__1.default);
        const Friends = mongoose_1.default.model("Friends", FriendSchema);
        const jack = new People({ name: "Jack", gender: "m" });
        const jill = new People({ name: "Jill", gender: "f" });
        const ann = new People({ name: "Ann", gender: "f" });
        before(function (done) {
            async_1.default.series([
                People.deleteMany.bind(People),
                Friends.deleteMany.bind(Friends),
                jack.save.bind(jack),
                jill.save.bind(jill),
                ann.save.bind(ann),
            ], done);
        });
        it("Should validate with single ID value that matches condition", function (done) {
            const i = new Friends({ mustBeFemale: false, bestFriend: jack });
            i.validate(done);
        });
        it("Should fail to validate single ID value that exists but does not match conditions", function (done) {
            const i = new Friends({ mustBeFemale: true, bestFriend: jack });
            i.validate(function (err) {
                err.should.property("name", "ValidationError");
                err.errors.should.property("bestFriend");
                done();
            });
        });
        it("Should validate array of ID values that match conditions", function (done) {
            const i = new Friends({ mustBeFemale: true, friends: [ann, jill] });
            i.validate(done);
        });
        it("Should not validate array of ID values containing value that exists but does not match conditions", function (done) {
            const i = new Friends({
                mustBeFemale: true,
                friends: [jill, jack],
            });
            i.validate(function (err) {
                err.should.property("name", "ValidationError");
                err.errors.should.property("friends");
                done();
            });
        });
    });
    describe("Array Duplicate Tests", function () {
        const InventoryItemSchema = new Schema({
            name: String,
        });
        function createInventorySchema(options) {
            const s = new Schema({
                items: [
                    {
                        type: Schema.Types.ObjectId,
                        ref: "InventoryItem",
                    },
                ],
            });
            s.plugin(__1.default, options);
            return s;
        }
        const InventoryNoDuplicatesSchema = createInventorySchema();
        const InventoryDuplicatesSchema = createInventorySchema({
            allowDuplicates: true,
        });
        const InventoryItem = mongoose_1.default.model("InventoryItem", InventoryItemSchema);
        const InventoryNoDuplicates = mongoose_1.default.model("InventoryNoDuplicates", InventoryNoDuplicatesSchema);
        const InventoryDuplicates = mongoose_1.default.model("InventoryDuplicatesSchema", InventoryDuplicatesSchema);
        const item1 = new InventoryItem({ name: "Widgets" });
        before(function (done) {
            async_1.default.series([item1.save.bind(item1)], done);
        });
        it("Should fail to validate duplicate entries with default option", function (done) {
            const i = new InventoryNoDuplicates({ items: [item1, item1] });
            i.validate(function (err) {
                err.should.property("name", "ValidationError");
                err.errors.should.property("items");
                done();
            });
        });
        it("Should pass validation of duplicate entries when allowDuplicates set", function (done) {
            const i = new InventoryDuplicates({ items: [item1, item1] });
            i.validate(done);
        });
    });
    describe("Recursion Tests", function () {
        const contactSchema = new mongoose_1.default.Schema({});
        const listSchema = new mongoose_1.default.Schema({
            name: String,
            contacts: [
                {
                    reason: String,
                    contactId: {
                        type: Schema.Types.ObjectId,
                        ref: "Contact",
                    },
                },
            ],
        });
        listSchema.plugin(__1.default);
        const Contact = mongoose_1.default.model("Contact", contactSchema);
        const List = mongoose_1.default.model("List", listSchema);
        it("Should allow empty array", function (done) {
            const obj = new List({ name: "Test", contacts: [] });
            obj.validate(done);
        });
        it("Should fail on invalid ID inside sub-schema", function (done) {
            const obj = new List({
                name: "Test",
                contacts: [{ reason: "My friend", contactId: "50136e40c78c4b9403000001" }],
            });
            obj.validate(function (err) {
                err.should.property("name", "ValidationError");
                err.errors.should.property("contacts.0.contactId");
                done();
            });
        });
        it("Should pass on valid ID in sub-schema", function (done) {
            const c = new Contact({});
            async_1.default.series([
                function (cb) {
                    c.save(cb);
                },
                function (cb) {
                    const obj = new List({
                        name: "Test",
                        contacts: [{ reason: "My friend", contactId: c }],
                    });
                    obj.validate(cb);
                },
            ], done);
        });
    });
    describe("Self recursive schema", function () {
        const Tasks = new mongoose_1.default.Schema();
        Tasks.add({
            title: String,
            subtasks: [Tasks],
        });
        Tasks.plugin(__1.default);
        const Task = mongoose_1.default.model("Tasks", Tasks);
        it("Should validate recursive task", function (done) {
            const t1 = new Task({ title: "Task 1" });
            const t2 = new Task({ title: "Task 2", subtasks: [t1] });
            async_1.default.series([
                function (cb) {
                    t1.save(cb);
                },
                function (cb) {
                    t2.save(cb);
                },
            ], done);
        });
    });
    describe("Connection tests", function () {
        it("Correct connection should be used when specified as option", function (done) {
            const UserSchema = new Schema({
                name: String,
            });
            const User1 = mongoose_1.default.model("User", UserSchema);
            const User2 = connection2.model("User", UserSchema);
            const ItemSchema1 = new Schema({
                owner: {
                    type: Schema.Types.ObjectId,
                    ref: "User",
                },
            });
            ItemSchema1.plugin(__1.default);
            const ItemSchema2 = new Schema({
                owner: {
                    type: Schema.Types.ObjectId,
                    ref: "User",
                },
            });
            ItemSchema2.plugin(__1.default, {
                connection: connection2,
            });
            const Item1 = mongoose_1.default.model("Item", ItemSchema1);
            const Item2 = connection2.model("Item", ItemSchema2);
            const u1 = new User1({ _id: "50136e40c78c4b9403000001" });
            const u2 = new User2({ _id: "50136e40c78c4b9403000002" });
            const i1 = new Item1({ owner: "50136e40c78c4b9403000001" });
            const i2 = new Item2({ owner: "50136e40c78c4b9403000002" });
            const bad1 = new Item1({ owner: "50136e40c78c4b9403000002" });
            const bad2 = new Item2({ owner: "50136e40c78c4b9403000001" });
            async_1.default.series([
                function (cb) {
                    async_1.default.parallel(mongoose_1.default.connections.map(function (c) {
                        return c.db.dropDatabase.bind(c.db);
                    }), cb);
                },
                function (cb) {
                    async_1.default.series([u1, u2, i1, i2].map(function (o) {
                        return o.save.bind(o);
                    }), cb);
                },
                function (cb) {
                    bad1.validate(function (err) {
                        (0, should_1.default)(!!err).eql(true);
                        err.should.property("name", "ValidationError");
                        err.errors.should.property("owner");
                        cb();
                    });
                },
                function (cb) {
                    bad2.validate(function (err) {
                        (0, should_1.default)(!!err).eql(true);
                        err.should.property("name", "ValidationError");
                        err.errors.should.property("owner");
                        cb();
                    });
                },
            ], done);
        });
    });
});
