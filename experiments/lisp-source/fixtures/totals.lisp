(program totals ((order json)) json
  (let net (- (get order subtotal) (get order discount)) (let fee (if (>= net 100) 0 10) (record net net fee fee due (+ net fee)))))
