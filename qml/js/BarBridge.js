.pragma library

// One persistent service publishes detached snapshots and a closed list of
// actions, so the bar widget also works when a replacement bar gives it no live
// service lookup. This follows the same pattern as Omamail's and Station's
// replacement-bar bridges.
//
// The built-in bar keeps its direct service object. Nothing here exposes the
// service: the widget can only read JSON-safe data and call the actions named
// in the allowlist.
var active = null

function publish(readSnapshot, actions) {
    var allowed = actions || ({})
    var api = Object.freeze({
        snapshot: function() {
            return active === api ? readSnapshot() : null
        },
        call: function(name, args) {
            if (active !== api) return undefined
            var key = String(name || "")
            if (!Object.prototype.hasOwnProperty.call(allowed, key)) return undefined
            if (typeof allowed[key] !== "function") return undefined
            return allowed[key].apply(null, Array.isArray(args) ? args : [])
        }
    })
    active = api
    return api
}

function current() { return active }

// A retired service must not clear a replacement published during hot reload.
function clear(api) { if (active === api) active = null }
