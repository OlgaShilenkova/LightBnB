SELECT properties.id, properties.title, properties.cost_per_night, reservations.start_date, AVG(rating)
FROM reservations 
JOIN properties ON property_id= properties.id
JOIN property_reviews ON reservation_id = reservations.id
WHERE reservations.guest_id = 1
AND reservations.end_date < now()::date
GROUP BY properties.id, properties.title, properties.cost_per_night, reservations.start_date
ORDER BY reservations.start_date 
LIMIT 10;