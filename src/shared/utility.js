export const updateObject = (object, updatedProperties) => {
    return {
            ...object,
            ...updatedProperties
    };
};
