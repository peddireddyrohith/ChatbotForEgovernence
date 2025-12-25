const Scheme = require('../models/Scheme');


const getSchemes = async (req, res) => {
    try {
        const schemes = await Scheme.find({});
        res.json(schemes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getSchemeById = async (req, res) => {
    try {
        const scheme = await Scheme.findById(req.params.id);
        if (scheme) {
            res.json(scheme);
        } else {
            res.status(404).json({ message: 'Scheme not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const createScheme = async (req, res) => {
    try {
        const { name, description, ministry, eligibilityCriteria, benefits, link } = req.body;

        const scheme = new Scheme({
            name,
            description,
            ministry,
            eligibilityCriteria,
            benefits,
            link
        });

        const createdScheme = await scheme.save();
        res.status(201).json(createdScheme);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateScheme = async (req, res) => {
    try {
        const { name, description, ministry, eligibilityCriteria, benefits, link } = req.body;

        const scheme = await Scheme.findById(req.params.id);

        if (scheme) {
            scheme.name = name || scheme.name;
            scheme.description = description || scheme.description;
            scheme.ministry = ministry || scheme.ministry;
            scheme.eligibilityCriteria = eligibilityCriteria || scheme.eligibilityCriteria;
            scheme.benefits = benefits || scheme.benefits;
            scheme.link = link || scheme.link;// Updates the scheme fields with new values if provided, otherwise retains existing values.

            const updatedScheme = await scheme.save();// Saves the updated scheme to the database.
            res.json(updatedScheme);//  Sends the updated scheme as a JSON response.
        } else {
            res.status(404).json({ message: 'Scheme not found' });//    Sends a 404 status code and message if the scheme to be updated is not found.
        }
    } catch (error) {
        res.status(500).json({ message: error.message });// Sends a 500 status code and error message if something goes wrong.
    }
};

const deleteScheme = async (req, res) => {//Defines an asynchronous function to delete a scheme by its ID.
    try {
        const scheme = await Scheme.findById(req.params.id);//Finds the scheme by its ID from the request parameters.

        if (scheme) {
            await scheme.deleteOne();//Deletes the found scheme from the database.
            res.json({ message: 'Scheme removed' });//Sends a success message as a JSON response.
        } else {
            res.status(404).json({ message: 'Scheme not found' });//Sends a 404 status code and message if the scheme to be deleted is not found.
        }
    } catch (error) {
        res.status(500).json({ message: error.message }); //Sends a 500 status code and error message if something goes wrong.
    }
};

module.exports = {//Exports the defined functions so they can be used in other parts of the application.
    getSchemes,
    getSchemeById,
    createScheme,
    updateScheme,
    deleteScheme
};
