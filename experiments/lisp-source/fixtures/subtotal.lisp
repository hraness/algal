(program subtotal ((order json)) json
  (let subtotal (* (get order quantity) (get order unit_price)) (record subtotal subtotal)))
