const typeDefs = `
    type Student {
        id: ID!
        firstName: String
        lastName: String
        professors: [Professor]
        classes: [Class]
    }

    type Professor {
        id: ID!
        firstName: String
        lastName: String
        students: [Student]
        teaches: [Class]
        examinerOf: Student @wrap(path: [students, firstName])
    }

    type Class {
        id: ID
        name: String
        students: [Student]
        teacher: Professor 
    }

    type Query {
        getStudents: [Student!]
        getProfessors: [Professor!]
        getClasses: [Class!]
    }
`;


module.exports = typeDefs;