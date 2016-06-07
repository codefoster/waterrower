// this is the declarative list of things to do when the
// waterrower sends us a data message
// it uses regular expressions to respond to certain message patterns
// m is the matches array and m[1] is the value of the primary regex match

export default [
    {
        name: 'distance (low byte)',
        pattern: /IDS055([\dA-F]+)/,
        action: function (m) {
            if (this.distance_l != m[1]) {
                this.distance_l = m[1];
                this.data$.next(null);
            }
        }
    },
    {
        name: 'distance (high byte)',
        pattern: /IDS056([\dA-F]+)/,
        action: function(m) {
            this.distance_h = m[1]
        }
    },
    {
        name: 'speed (low byte)',
        pattern: /IDS14A([\dA-F]+)/,
        action: function (m) {
            if (this.speed_l != m[1])
                this.speed_l = m[1];
        }
    },
    {
        name: 'speed (high byte)',
        pattern: /IDS14B([\dA-F]+)/,
        action: function (m) {
            if (this.speed_h != m[1]) {
                this.speed_h = m[1];
                this.data$.next(null);
            }
        }
    },
    {
        name: 'stroke rate',
        pattern: /IDS142([\dA-F]+)/,
        action: function (m) {
            if (this.strokeRate != m[1]) {
                this.strokeRate = m[1];
                this.data$.next(null);
            }
        }
    },
    {
        name: 'clock (seconds)',
        pattern: /IDS1E1([\dA-F]+)/,
        action: function (m) {
            if (this.clock != m[1]) {
                this.clock = m[1];
                this.data$.next(null);
            }
        }
    },
    {
        name: 'pulse',
        pattern: /P(\d+)/,
        action: null
    }
];
