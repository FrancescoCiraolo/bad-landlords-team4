const MAX_RESULTS = 5;

class SearchState {

    #_db;

    #error_div;
    #owner_search_card;
    #owner_input;
    #owners_list;

    set db(db) {
        this.#error_div = $('#error')
        this.#owner_search_card = $('#search-by-owner')
        this.#owner_input = $('#owner_input')
        this.#owners_list = $('#owners_list')

        this.#_db = db;

        this.#clear_owner_name();
        this.#owner_search_card.addClass('ready');
        this.#owner_input.on('input', () => this.suggest_owners(this.#owner_input.val()))
    }

    async suggest_owners(val) {
        this.#owner_search_card.removeClass('chosen');

        if (!val) {
            this.#owners_list.empty();
            this.#owner_search_card.removeClass('suggestions')
        } else {
            let suggestions_list;
            let tot;

            suggestions_list = [];

            let res = this.#_db.exec(`SELECT * FROM owners WHERE name LIKE "%${val}%"`)

            if (res.length > 0)
                suggestions_list = res[0].values;

            tot = suggestions_list.length;

            suggestions_list = suggestions_list.slice(0, MAX_RESULTS);
            suggestions_list = suggestions_list.map(row => this.#create_suggestion_row(row[0], row[1]));


            $('#owner_suggestions_state').text(`Shown ${suggestions_list.length} owners (of ${tot})`)
            this.#owners_list.empty();
            this.#owners_list.append(suggestions_list);
            this.#owner_search_card.addClass('suggestions');
        }
    }

    async chose_owner(owner_id) {
        this.#clear_owner_name();

        let name = this.#_db.exec(`SELECT name FROM owners WHERE id = ${owner_id}`)

        if (name.length === 0)
            return;

        let buildings = this.#_db.exec(`
        SELECT b.id, b.address, count(v.id) AS c
            FROM violations AS v
            LEFT JOIN buildings AS b
                ON b.id = v.building_id
            WHERE v.owner_id = ${owner_id}
            GROUP BY v.building_id`)

        let violations = this.#_db.exec(`
        SELECT v.id, v.type, v.description, b.address
            FROM violations AS v
            LEFT JOIN buildings AS b
                ON b.id = v.building_id
            WHERE v.owner_id = ${owner_id};`)

        buildings = buildings.length > 0 ? buildings[0].values : [];
        violations = violations.length > 0 ? violations[0].values : [];

        await this.suggest_owners(null);
        this.#owner_search_card.addClass('chosen');
        $('#owner_name').text(name[0].values[0])
        $('#buildings tbody').empty().append(buildings.map(this.#build_building_row))
        $('#violations tbody').empty().append(violations.map(this.#build_violation_row))
    }

    #create_suggestion_row(item_id, item_name) {
        let el = $(`<a href='#' class="list-group-item list-group-item-action">${item_name}</a>`)
        el.on('click', () => this.chose_owner(item_id))
        return el
    }

    #clear_owner_name() {
        this.#owner_input.val('')
    }

    #build_building_row(building_entry) {
        return $(`
                <tr>
                  <th scope="row">${building_entry[0]}</th>
                  <td>${building_entry[1]}</td>
                  <td>${building_entry[2]}</td>
                </tr>`)
    }

    #build_violation_row(violation_entry) {
        return $(`
                <tr>
                  <th scope="row">${violation_entry[0]}</th>
                  <td>${violation_entry[1]}</td>
                  <td>${violation_entry[2]}</td>
                  <td>${violation_entry[3]}</td>
                </tr>`)
    }
}

let state = new SearchState();

$(document).ready(function() {

    const initSqlJs = window.initSqlJs;

    const conf = {
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
    };

    Promise
        .all([initSqlJs(conf),
            fetch("data/rentsmart.db").then(res => res.arrayBuffer())])
        .then(data => state.db = new data[0].Database(new Uint8Array(data[1])))
});