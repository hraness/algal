(program quote ((order json)) json
  (with-total subtotal (* (get order quantity) (get order unit_price))
    (let shipping (if (>= subtotal 50) 0 5)
      (record subtotal subtotal shipping shipping total (+ subtotal shipping)))))
