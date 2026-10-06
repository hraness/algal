(program discount ((order json)) json
  (let discount (* (get order total) 0.1) (record total (- (get order total) discount))))
