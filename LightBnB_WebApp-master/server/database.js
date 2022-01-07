const properties = require("./json/properties.json");
const users = require("./json/users.json");
const { Pool } = require("pg");

const pool = new Pool({
  user: "vagrant",
  password: "123",
  host: "localhost",
  database: "lightbnb",
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  return pool
    .query(
      `SELECT * FROM users 
  WHERE users.email = $1 `,
      [email] || [null]
    )
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  return pool
    .query(
      `SELECT * FROM users 
  WHERE users.id = $1 `,
      [id] || [null]
    )
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getUserWithId = getUserWithId;

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  const values = [user.name, user.email, user.password];

  return pool
    .query(
      `INSERT INTO users (name, email, password)
  VALUES ($1, $2, $3)
  RETURNING  *;`,
      values
    )

    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  const queryString = `
    SELECT properties.*, reservations.*, AVG(rating) as average_rating
    FROM reservations 
    JOIN properties ON reservations.property_id= properties.id
    JOIN property_reviews ON properties.id = property_reviews.property_id
    WHERE reservations.guest_id = $1
    AND reservations.end_date < now()::date
    GROUP BY properties.id, reservations.id
    ORDER BY reservations.start_date 
    LIMIT $2;
  `;
  const values = [guest_id, limit];

  return pool
    .query(queryString, values)
    .then((result) => result.rows)
    .catch((err) => console.log(err.message));
};
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 * 
 * SELECT  properties.id, properties.title, properties.cost_per_night, AVG(property_reviews.rating) as average_rating 
FROM properties JOIN property_reviews 
ON property_id = properties.id
WHERE city LIKE '%ancouv%'
GROUP BY properties.id
HAVING AVG(property_reviews.rating) >=4
ORDER BY cost_per_night
LIMIT 10;
 * 
 */
const getAllProperties = function (options, limit = 10) {
  //array for query params coming from options
  const queryParams = [];

  //initial query
  let queryString = `
  SELECT  properties.* , AVG(property_reviews.rating) as average_rating 
  FROM properties JOIN property_reviews 
  ON property_id = properties.id
  WHERE 
  `;

  // MIGHT BE WE NEED
  let multiWhereRequest = [];
  // then multiWhereRequest.join(' AND '); // --> 'a AND b AND c'

  // 1
  //if an owner_id is passed in, only return properties belonging to that owner

  if (options.owner_id) {
    //add first element to array
    queryParams.push(`${options.owner_id}`);
    //add to initial queryString
    multiWhereRequest.push(` properties.owner_id = $${queryParams.length} `);
  }

  //2
  // if city inserted in request
  if (options.city) {
    //add first element to array as a string same way as for LIKE ,imprecise value
    queryParams.push(`%${options.city}%`);
    //add to initial queryString
    multiWhereRequest.push(`city LIKE $${queryParams.length}`);
  }

  //3
  // if a minimum_price_per_night and a maximum_price_per_night, only return properties within that price range
  if (options.minimum_price_per_night) {
    queryParams.push(options.minimum_price_per_night);
    multiWhereRequest.push(
      ` properties.cost_per_night * 100 >= $${queryParams.length}`
    );
  }
  if (options.maximum_price_per_night) {
    queryParams.push(options.maximum_price_per_night);

    //add to initial queryString
    multiWhereRequest.push(
      ` properties.cost_per_night * 100 <= $${queryParams.length} `
    );
  }

  //4
  //if a minimum_rating is passed in, only return properties with a rating equal to or higher than that
  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);

    multiWhereRequest.push(` average_rating  >= $${queryParams.length}`);
  }

  // 5
  // add last element to array
  queryParams.push(limit);

  //add the rest to query request
  queryString += multiWhereRequest.join(" AND "); // --> 'a AND b AND c'
  queryString += `
  GROUP BY properties.id
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  //check what we send
  console.log(queryString, queryParams);

  //run the query
  return pool.query(queryString, queryParams).then((res) => res.rows);
};
exports.getAllProperties = getAllProperties;

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const values = [
    property.title,
    property.description,
    property.number_of_bedrooms,
    property.number_of_bathrooms,
    property.parking_spaces,
    property.cost_per_night,
    property.thumbnail_photo_url,
    property.cover_photo_url,
    property.street,
    property.country,
    property.city,
    property.province,
    property.post_code,
  ];

  return pool
    .query(
      `INSERT INTO properties (title, description, number_of_bedrooms, number_of_bathrooms, parking_spaces, cost_per_night, thumbnail_photo_url,cover_photo_url, street, country , city, province, post_code)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING  *;`,
      values
    )
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.addProperty = addProperty;
