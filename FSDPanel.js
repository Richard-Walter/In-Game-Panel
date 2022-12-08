class FSDPanel extends TemplateElement {
  constructor() {
    super(...arguments);

    //panel info
    this.panelActive = false;
    this.started = false;
    this.ingameUi = null;
    this.busy = false;
    this.debugEnabled = false;
    this.default_status_text = "Log in track flight";

    //autherization info
    this.user_id = null;
    this.is_authenticated = null;
    this.loginBtn = null;
    this.logoutBtn = null;

    //connection info
    this.serverInterval = null;
    this.simConnectInterval = null;
    this.FSD_URL = "http://localhost:3000"; //local
    // this.FSD_URL = 'http://127.0.0.1:5000';    //local Flask
    //this.FSD_URL = 'https://www.flightsimdiscovery.com';    //production

    //Active flight info
    this.activeFlightInfo = null;
    this.fp_data = {};

    if (this.started) {
      return;
    }
    this.started = true;
  }

  collapse(collapsed) {
    if (collapsed) {
      this.classList.add("collapsed");
    } else {
      this.classList.remove("collapsed");
    }

    this.collapsed = collapsed;
  }

  toggle_collapse() {
    this.collapse(!this.collapsed);
  }

  //CALLED BY MSFS
  connectedCallback() {
    super.connectedCallback();

    var self = this;
    this.ingameUi = this.querySelector("ingame-ui");
    this.content_iframe = document.getElementById("content_iframe");
    this.status_area = document.getElementById("#status_area");

    //add button listeners
    document.getElementById("connect_button").addEventListener("click", function () {
      self.initialiseMap();
    });
    document.getElementById("disconnect_button").addEventListener("click", function () {
      self.disconnect();
    });

    //todo why doesnt this work
    self.initialiseMap();

    //listeners when panbel is active and inactive
    if (this.ingameUi) {
      this.ingameUi.addEventListener("panelActive", (e) => {
        self.panelActive = true;
      });

      this.ingameUi.addEventListener("panelInactive", (e) => {
        self.panelActive = false;
      });
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.disconnect();
  }

  //what is this for
  getActiveFlightInfo() {
    return this.activeFlightInfo;
  }

  //login in user and retrieve user_id
  initialiseMap() {
    console.log("Initialising map...");

    let status_text_element = document.getElementById("status_text");
    let infobar_element = document.getElementById("infobar");
    let form_element = document.getElementById("status_area");
    let connection_area_element = document.getElementById("connection_area");

    let content_iframe = document.getElementById("content_iframe");

    status_text_element.innerHTML = "Connecting to server";
    //test get html
    // let httpGET = new XMLHttpRequest();
    // httpGET.open("GET", this.FSD_URL + "/html", true);
    // httpGET.onload = () => {
    //   console.log("status of HTML  GET request is " + httpGET.status);
    //   // let body = JSON.parse(httpGET.response);
    //   // let body = httpGET.response;
    //   console.log(httpGET.response);
    // };
    // httpGET.onerror = function (e) {
    //   console.log("http on error - most likely because the server is down", e);
    // };
    // console.log("Test get");
    // httpGET.send();

    //test get hello
    // let httpGET = new XMLHttpRequest();
    // httpGET.open("GET", this.FSD_URL + "/hello", true);
    // httpGET.onload = () => {
    //   console.log("status og GET request is " + httpGET.status);
    //   let body = JSON.parse(httpGET.response);
    //   // let body = httpGET.response;
    //   console.log(body.data);
    // };

    // httpGET.onerror = function (e) {
    //   console.log("http on error - most likely because the server is down", e);
    // };
    // console.log("Test get");
    // httpGET.send();

    //test post
    // let httpPOST = new XMLHttpRequest();
    // httpPOST.open("POST", this.FSD_URL + "/testpost", true);
    // httpPOST.onload = () => {
    //   console.log("status of POST request is " + httpPOST.status);
    //   console.log(httpPOST.response);
    // };

    // httpPOST.onerror = function (e) {
    //   console.log("http on error - most likely because the server is down", e);
    // };

    // console.log("Test post");
    // httpPOST.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    // //httpPOST.setRequestHeader("Content-Type", "text/plain; charset=utf-8");
    // httpPOST.send(JSON.stringify({ email: "hello@user.com", name: "Tester"}));

    var self = this;

    //test server connection
    let http = new XMLHttpRequest();
    http.open("GET", this.FSD_URL + "/test", true);

    //http.setRequestHeader('Content-Type', 'application/json');
    //http.setRequestHeader('Content-Type', 'text/plain; charset=utf-8');

    http.onload = function () {
      if (http.status === 200) {
        infobar_element.hidden = true;
        content_iframe.hidden = false;
        connection_area_element.hidden = true;
        form_element.hidden = true;

        status_text_element.innerHTML = "Establishing connection ... please wait";

        content_iframe.src = "http://localhost:3000/api/osm";

        // //GET ACTIVE FLIGHT DATA USING SIMCONNECT EVERY 3S
        self.simConnectInterval = setInterval(() => {
          this.activeFlightInfo = self.getSimconnectData();
        }, 3000);

        console.log("INTIAL SIMCONNECT INTERVAL " + self.simConnectInterval);

        // // UPDATE FLASK SERVER EVERY 4S
        self.serverInterval = setInterval(() => {
          self.updateUserLocation(this.activeFlightInfo);
        }, 4000);

        console.log("INTIAL SERVER INTERVAL " + self.serverInterval);

        //self.saveActiveFlightPlan(self.user_id);
      } else {
        console.log(`User cannot be authorised`);
        console.log(http.responseText);
        infobar_element.hidden = false;
        status_text_element.innerHTML = "Something went wrong.  Response status code " + http.status;
      }
    };
    http.onerror = function (e) {
      infobar_element.hidden = false;
      status_text_element.innerHTML = "Something went wrong.  Unable to connect to server.";
    };

    // //http.send(JSON.stringify(credentials_dict));
    http.send();
  }

  //update users location to server database
  updateUserLocation(requestBody) {
    let status_text_element = document.getElementById("status_text");
    let connection_area_element = document.getElementById("connection_area");
    let infobar_element = document.getElementById("infobar");
    let form_element = document.getElementById("status_area");
    let content_iframe = document.getElementById("content_iframe");

    if (connection_area_element.hidden == false) {
      console.log("user has requested to stop tracking");
      return;
    }

    if (requestBody == null) {
      console.log("No simconnect data-try again");
      return;
    }

    let http = new XMLHttpRequest();
    http.open("POST", this.FSD_URL + "/users/update_active_flight", true);
    http.setRequestHeader('Content-Type', 'application/json');
    // http.setRequestHeader("Content-Type", "text/plain; charset=utf-8");

    http.onload = () => {
      // let logout_data = JSON.parse(http.response);
      // //console.log(logout_data['logout']);
      // let logout = logout_data["logout"];

      // if (logout) {
      //   this.disconnect();
      // }

      if (http.status === 200) {
        console.log("User flight data sent to server");
        status_text_element.innerHTML = "TRACKING FLIGHT";
      } else if (http.status === 2000) {
        //new user - change info text to make sure they are logged in
        status_text_element.innerHTML =
          "TRACKING FLIGHT Please log in at www.flightsimdiscovery.com and click the 'show active flight' button";
      } else if (http.status === 204) {
        console.log(`user has not check show active flight on browser`);
        console.log(http.responseText);
        status_text_element.innerHTML = "Please log in at www.flightsimdiscovery.com and click the 'show active flight' button";
      } else {
        console.log("HTTP STATUS IS: " + String(http.status));
        status_text_element.innerHTML = "Users active flight could not be updated to the Fight Sim Discovery Server";
      }
    };

    http.onerror = function (e) {
      console.log("http on error - most likely because the server is down");
      status_text_element.innerHTML =
        "Network Error.  Please check internet connection or try again later.  If problem persists then report bug at www.flightsimdiscovery.com.";
      clearInterval(this.serverInterval);
      clearInterval(this.simConnectInterval);

      infobar_element.hidden = false;
      content_iframe.hidden = true;
      connection_area_element.hidden = false;
      form_element.hidden = false;
    };

    http.send(JSON.stringify(requestBody)); 
  }

  getSimconnectData() {
    // console.log("querying simconnect");

    let user_id = this.user_id;
    let lat = SimVar.GetSimVarValue("PLANE LATITUDE", "degrees").toFixed(6);
    let lng = SimVar.GetSimVarValue("PLANE LONGITUDE", "degrees").toFixed(6);
    let alt = SimVar.GetSimVarValue("PLANE ALTITUDE", "meters").toFixed(3);
    let alt_agl = SimVar.GetSimVarValue("RADIO HEIGHT", "feet").toFixed(0);
    let ias = SimVar.GetSimVarValue("AIRSPEED INDICATED", "knots").toFixed(0);
    let ground_speed = SimVar.GetSimVarValue("GROUND VELOCITY", "knots").toFixed(0);
    let heading_true = SimVar.GetSimVarValue("PLANE HEADING DEGREES TRUE", "degrees").toFixed(0);
    let aircraft_type = SimVar.GetSimVarValue("ATC TYPE", "string");
    let aircraft_model = SimVar.GetSimVarValue("ATC MODEL", "string");
    let atc_id = SimVar.GetSimVarValue("ATC ID", "string");
    let title = SimVar.GetSimVarValue("TITLE", "string");
    let atc_airline = SimVar.GetSimVarValue("ATC AIRLINE", "string");
    let flight_number = SimVar.GetSimVarValue("ATC FLIGHT NUMBER", "string");
    let parking_brake_indicator = SimVar.GetSimVarValue("BRAKE PARKING INDICATOR", "bool");
    let electrical_master_battery = SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "bool");
    let avionics_master_switch = SimVar.GetSimVarValue("AVIONICS MASTER SWITCH", "bool");
    let gps_ground_true_track = SimVar.GetSimVarValue("GPS GROUND MAGNETIC TRACK", "degrees").toFixed(0);
    let sea_level_pressure = SimVar.GetSimVarValue("SEA LEVEL PRESSURE", "millibars").toFixed(0);
    let ambient_temperature = SimVar.GetSimVarValue("AMBIENT TEMPERATURE", "celsius").toFixed(0);
    let wind_speed = SimVar.GetSimVarValue("AMBIENT WIND VELOCITY", "knots").toFixed(0);
    let wind_direction = SimVar.GetSimVarValue("AMBIENT WIND DIRECTION", "degrees").toFixed(0);

    const activeFlightData = {
      user_id,
      title,
      atc_id,
      lat,
      lng,
      alt,
      alt_agl,
      ground_speed,
      ias,
      heading_true,
      atc_id,
      aircraft_type,
      aircraft_model,
      parking_brake_indicator,
      electrical_master_battery,
      avionics_master_switch,
      gps_ground_true_track,
      sea_level_pressure,
      ambient_temperature,
      wind_speed,
      wind_direction,
    };

    return activeFlightData;
  }

  //stop quering simConnect and
  disconnect() {
    let status_text_element = document.getElementById("status_text");
    let connection_area_element = document.getElementById("connection_area");
    let infobar_element = document.getElementById("infobar");
    let form_element = document.getElementById("status_area");
    let content_iframe = document.getElementById("content_iframe");

    infobar_element.hidden = true;
    content_iframe.hidden = true;
    connection_area_element.hidden = false;
    form_element.hidden = false;

    console.log("disconnecting from tracking active flight");

    clearInterval(this.serverInterval);
    clearInterval(this.simConnectInterval);
    status_text_element.innerHTML = this.default_status_text;
    // status_text_element.innerHTML = 'Log in here and at www.flightsimdiscovery.com to track flight';
  }

  saveActiveFlightPlan(user_id) {
    RegisterViewListener("JS_LISTENER_FLIGHTPLAN", () => {
      console.log("REGISTERING LISTENER");
      Coherent.call("LOAD_CURRENT_ATC_FLIGHTPLAN");

      Coherent.call("GET_FLIGHTPLAN").then((flightPlanData) => {
        // console.log(flightPlanData.waypoints[0]);

        let waypoint_data_list = [];
        this.fp_data["user_id"] = user_id;

        for (let i = 0; i < flightPlanData.waypoints.length; i++) {
          var waypoint_info = {};
          var wp = flightPlanData.waypoints[i];
          //waypoint_info['user_id'] = self.user_id;
          // waypoint_info['user_id'] = 'rjw102';
          waypoint_info["ident"] = wp.ident;
          waypoint_info["icao"] = wp.icao;
          waypoint_info["lat"] = wp.lla.lat;
          waypoint_info["lng"] = wp.lla.long;
          waypoint_info["alt"] = wp.lla.alt * 3.2808;
          waypoint_info["bearing"] = isFinite(wp.heading) ? wp.heading : 0;
          waypoint_info["distance"] = wp.distance;
          waypoint_info["estimatedTimeEnRoute"] = wp.estimatedTimeEnRoute;

          waypoint_data_list.push(waypoint_info);
        }

        this.fp_data["waypoint_data_list"] = waypoint_data_list;

        let http = new XMLHttpRequest();

        http.open("POST", this.FSD_URL + "/users/save_active_flight_plan", true);
        http.setRequestHeader("Content-Type", "application/json");

        http.onload = function () {
          if (http.status === 200) {
            console.log(`FLIGHT PLAN SAVED`);
            //console.log(http.responseText);
          } else {
            console.log(`Cant save flight plan`);
            //console.log(http.responseText);
          }
        };

        http.onerror = function (e) {
          console.log("Network error saving flight plan");
        };

        console.log("sending flight plan to flask");
        http.send(JSON.stringify(this.fp_data));
      });
    });
  }
}

window.customElements.define("ingamepanel-custom", FSDPanel);
checkAutoload();
