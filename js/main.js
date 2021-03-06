/* μlogger
 *
 * Copyright(C) 2017 Bartek Fabiszewski (www.fabiszewski.net)
 *
 * This is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, see <http://www.gnu.org/licenses/>.
 */

// general stuff
if (units == 'imperial') {
  factor_kmh = 0.62; //to mph
  unit_kmh = 'mph';
  factor_m = 3.28; // to feet
  unit_m = 'ft';
  factor_km = 0.62; // to miles
  unit_km = 'mi';
}
else {
  factor_kmh = 1;
  unit_kmh = 'km/h';
  factor_m = 1;
  unit_m = 'm';
  factor_km = 1;
  unit_km = 'km';
}
var latest = 0;
var latestTime = 0;
var live = 0;
var chart;
var altitudes = new Array();
var altTimeout;
function displayChart() {
  if (chart) { google.visualization.events.removeAllListeners(chart); }
  var data = new google.visualization.DataTable();
  data.addColumn('number', 'id');
  data.addColumn('number', 'altitude');
  var altLen = altitudes.length;
  for (var i = 0; i < altLen; i++) {
    data.addRow([(i + 1), Math.round((altitudes[i] * factor_m))]);
  }

  var options = {
    title: lang['altitude'] + ' (' + unit_m + ')',
    hAxis: { textPosition: 'none' },
    legend: { position: 'none' }
  };

  chart = new google.visualization.LineChart(document.getElementById('chart'));
  chart.draw(data, options);

  addChartEvent(chart);
}

function toggleChart(i) {
  var altLen = altitudes.length;
  if (altLen <= 1) { return; }
  var e = document.getElementById('bottom');
  if (arguments.length < 1) {
    if (e.style.display == 'block') { i = 0 }
    else { i = 1; }
  }
  if (i == 0) {
    chart.clearChart();
    e.style.display = 'none';
  }
  else {
    e.style.display = 'block';
    displayChart();
  }
}

function toggleMenu(i) {
  var emenu = document.getElementById('menu');
  var emain = document.getElementById('main');
  var ebutton = document.getElementById('menu-close');
  if (arguments.length < 1) {
    if (ebutton.innerHTML == '»') { i = 0 }
    else { i = 1; }
  }
  if (i == 0) {
    emenu.style.width = '0';
    emain.style.marginRight = '0';
    ebutton.style.right = '0';
    ebutton.innerHTML = '«';
  }
  else {
    emenu.style.width = '165px';
    emain.style.marginRight = '165px';
    ebutton.style.right = '165px';
    ebutton.innerHTML = '»';
  }
}

function getXHR() {
  var xmlhttp = null;
  if (window.XMLHttpRequest) {
    xmlhttp = new XMLHttpRequest();
  }
  else {
    xmlhttp = new ActiveXObject('Microsoft.XMLHTTP');
  }
  return xmlhttp;
}

function loadTrack(userid, trackid, update) {
  if (trackid < 0) { return; }
  if (latest == 1) { trackid = 0; }
  var xhr = getXHR();
  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4 && xhr.status == 200) {
      var xml = xhr.responseXML;
      var positions = xml.getElementsByTagName('position');
      if (positions.length > 0) {
        clearMap();
        displayTrack(xml, update);
      }
      xhr = null;
    }
  }
  xhr.open('GET', 'utils/getpositions.php?trackid=' + trackid + '&userid=' + userid, true);
  xhr.send();
}

function parsePosition(p) {
  // read data
  var latitude = getNode(p, 'latitude');
  var longitude = getNode(p, 'longitude');
  var altitude = getNode(p, 'altitude'); // may be null
  if (altitude != null) { altitude = parseInt(altitude); }
  var speed = getNode(p, 'speed'); // may be null
  if (speed != null) { speed = parseInt(speed); }
  var bearing = getNode(p, 'bearing'); // may be null
  if (bearing != null) { bearing = parseInt(bearing); }
  var accuracy = getNode(p, 'accuracy'); // may be null
  if (accuracy != null) { accuracy = parseInt(accuracy); }
  var provider = getNode(p, 'provider'); // may be null
  var comments = getNode(p, 'comments'); // may be null
  var username = getNode(p, 'username');
  var trackname = getNode(p, 'trackname');
  var tid = getNode(p, 'trackid');
  var dateoccured = getNode(p, 'dateoccured');
  var distance = parseInt(getNode(p, 'distance'));
  var seconds = parseInt(getNode(p, 'seconds'));
  return {
    'latitude': latitude,
    'longitude': longitude,
    'altitude': altitude,
    'speed': speed,
    'bearing': bearing,
    'accuracy': accuracy,
    'provider': provider,
    'comments': comments,
    'username': username,
    'trackname': trackname,
    'tid': tid,
    'dateoccured': dateoccured,
    'distance': distance,
    'seconds': seconds
  };
}

function getPopupHtml(p, i, count) {
  var dateTime = p.dateoccured.split(" ");
  var date = dateTime[0];
  var time = dateTime[1];
  var provider = '';
  if (p.provider == 'gps') {
    provider = ' (<img class="icon" alt="' + lang['gps'] + '" title="' + lang['gps'] + '"  src="images/gps_dark.svg">)';
  } else if (p.provider == 'network') {
    provider = ' (<img class="icon" alt="' + lang['network'] + '" title="' + lang['network'] + '"  src="images/network_dark.svg">)';
  }
  var stats = '';
  if (latest == 0) {
    stats =
      '<div id="pright">' +
      '<img class="icon" alt="' + lang['track'] + '" src="images/stats_blue.svg" style="padding-left: 3em;"><br>' +
      '<img class="icon" alt="' + lang['ttime'] + '" title="' + lang['ttime'] + '" src="images/time_blue.svg"> ' +
      p.totalSeconds.toHMS() + '<br>' +
      '<img class="icon" alt="' + lang['aspeed'] + '" title="' + lang['aspeed'] + '" src="images/speed_blue.svg"> ' +
      ((p.totalSeconds > 0) ? ((p.totalMeters / p.totalSeconds).toKmH() * factor_kmh).toFixed() : 0) + ' ' + unit_kmh + '<br>' +
      '<img class="icon" alt="' + lang['tdistance'] + '" title="' + lang['tdistance'] + '" src="images/distance_blue.svg"> ' +
      (p.totalMeters.toKm() * factor_km).toFixed(2) + ' ' + unit_km + '<br>' + '</div>';
  }
  popup =
    '<div id="popup">' +
    '<div id="pheader">' +
    '<div><img alt="' + lang['user'] + '" title="' + lang['user'] + '" src="images/user_dark.svg"> ' + htmlEncode(p.username) + '</div>' +
    '<div><img alt="' + lang['track'] + '" title="' + lang['track'] + '" src="images/route_dark.svg"> ' + htmlEncode(p.trackname) + '</div>' +
    '</div>' +
    '<div id="pbody">' +
    ((p.comments != null) ? '<div id="pcomments">' + htmlEncode(p.comments) + '</div>' : '') +
    '<div id="pleft">' +
    '<img class="icon" alt="' + lang['time'] + '" title="' + lang['time'] + '" src="images/calendar_dark.svg"> ' + date + '<br>' +
    '<img class="icon" alt="' + lang['time'] + '" title="' + lang['time'] + '" src="images/clock_dark.svg"> ' + time + '<br>' +
    ((p.speed != null) ? '<img class="icon" alt="' + lang['speed'] + '" title="' + lang['speed'] + '" src="images/speed_dark.svg"> ' +
    (p.speed.toKmH() * factor_kmh) + ' ' + unit_kmh + '<br>' : '') +
    ((p.altitude != null) ? '<img class="icon" alt="' + lang['altitude'] + '" title="' + lang['altitude'] + '" src="images/altitude_dark.svg"> ' +
    (p.altitude * factor_m).toFixed() + ' ' + unit_m + '<br>' : '') +
    ((p.accuracy != null) ? '<img class="icon" alt="' + lang['accuracy'] + '" title="' + lang['accuracy'] + '" src="images/accuracy_dark.svg"> ' +
    (p.accuracy * factor_m).toFixed() + ' ' + unit_m + provider + '<br>' : '') +
    '</div>' +
    stats +
    '</div><div id="pfooter">' + sprintf(lang['pointof'], i + 1, count) + '</div>' +
    '</div>';
  return popup;
}

function load(type, userid, trackid) {
  var url = 'utils/download.php?type=' + type + '&userid=' + userid + '&trackid=' + trackid;
  window.location.assign(url);
}

function updateSummary(l, d, s) {
  var t = document.getElementById('summary');
  if (latest == 0) {
    t.innerHTML = '<u>' + lang['summary'] + '</u><br>' +
      '<span><img class="icon" alt="' + lang['tdistance'] + '" title="' + lang['tdistance'] + '" src="images/distance.svg"> ' + (d.toKm() * factor_km).toFixed(2) + ' ' + unit_km + '</span>' +
      '<span><img class="icon" alt="' + lang['ttime'] + '" title="' + lang['ttime'] + '" src="images/time.svg"> ' + s.toHMS() + '</span>';
  }
  else {
    t.innerHTML = '<u>' + lang['latest'] + ':</u><br>' + l;
  }
}

function getNode(p, name) {
  return ((p.getElementsByTagName(name)[0].childNodes[0]) ? p.getElementsByTagName(name)[0].childNodes[0].nodeValue : null);
}

// seconds to (d) H:M:S
Number.prototype.toHMS = function() {
  var s = this;
  var d = Math.floor(s / 86400);
  var h = Math.floor((s % 86400) / 3600);
  var m = Math.floor(((s % 86400) % 3600) / 60);
  s = ((s % 86400) % 3600) % 60;

  return ((d > 0) ? (d + ' d ') : '') + (('00' + h).slice(-2)) + ':' + (('00' + m).slice(-2)) + ':' + (('00' + s).slice(-2)) + '';
};

// meters to km
Number.prototype.toKm = function() {
  return Math.round(this / 10) / 100;
};

// m/s to km/h
Number.prototype.toKmH = function() {
  return Math.round(this * 3600 / 10) / 100;
};

// negate value
function toggleLatest() {
  if (latest == 0) {
    latest = 1;
    loadTrack(userid, 0, 1);
  }
  else {
    latest = 0;
    loadTrack(userid, trackid, 1);
  }
}

function setTrack(t) {
  document.getElementsByName('track')[0].value = t;
}

function selectTrack(f) {
  if (f.selectedIndex >= 0) {
    trackid = f.options[f.selectedIndex].value;
  } else {
    trackid = 0;
  }
  document.getElementById('latest').checked = false;
  if (latest == 1) { toggleLatest(); }
  loadTrack(userid, trackid, 1);
}

function selectUser(f) {
  userid = f.options[f.selectedIndex].value;
  if (f.options[0].disabled == false) {
    f.options[0].disabled = true;
  }
  document.getElementById('latest').checked = false;
  if (latest == 1) { toggleLatest(); }
  getTracks(userid);
}

function getTracks(userid) {
  var xhr = getXHR();
  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4 && xhr.status == 200) {
      var xml = xhr.responseXML;
      var trackSelect = document.getElementsByName('track')[0];
      clearOptions(trackSelect);
      var tracks = xml.getElementsByTagName('track');
      if (tracks.length > 0) {
        fillOptions(xml);
      } else {
        clearMap();
      }
      xhr = null;
    }
  }
  xhr.open('GET', 'utils/gettracks.php?userid=' + userid, true);
  xhr.send();
}

function fillOptions(xml) {
  var trackSelect = document.getElementsByName('track')[0];
  var tracks = xml.getElementsByTagName('track');
  var trackLen = tracks.length;
  for (var i = 0; i < trackLen; i++) {
    var trackid = getNode(tracks[i], 'trackid');
    var trackname = getNode(tracks[i], 'trackname');
    var option = document.createElement("option");
    option.value = trackid;
    option.innerHTML = htmlEncode(trackname);
    trackSelect.appendChild(option);
  }
  var defaultTrack = getNode(tracks[0], 'trackid');
  loadTrack(userid, defaultTrack, 1);
}

function clearOptions(el) {
  if (el.options) {
    while (el.options.length) {
      el.remove(0);
    }
  }
}

var auto;
function autoReload() {
  if (live == 0) {
    live = 1;
    auto = setInterval(function () { loadTrack(userid, trackid, 0); }, interval * 1000);
  }
  else {
    live = 0;
    clearInterval(auto);
  }
}

function setTime() {
  var i = parseInt(prompt(lang['newinterval']));
  if (!isNaN(i) && i != interval) {
    interval = i;
    document.getElementById('auto').innerHTML = interval;
    // if live tracking on, reload with new interval
    if (live == 1) {
      live = 0;
      clearInterval(auto);
      autoReload();
    }
    // save current state as default
    setCookie('interval', interval, 30);
  }
}

// dynamic change of map api
var savedBounds;
function loadMapAPI(api) {
  mapapi = api;
  savedBounds = getBounds();
  document.getElementById("map-canvas").innerHTML = '';
  var url = new Array();
  if (api == 'gmaps') {
    url.push('js/api_gmaps.js');
    url.push('//maps.googleapis.com/maps/api/js?' + ((gkey !== null) ? ('key=' + gkey + '&') : '') + 'callback=init');
  }
  else {
    url.push('js/api_openlayers.js');
    url.push('//openlayers.org/api/OpenLayers.js');
  }
  addScript(url[0]);
  waitAndLoad(api, url);
}

var loadTime = 0;
function waitAndLoad(api, url) {
  // wait till first script loaded
  if (loadTime > 5000) { loadTime = 0; alert(sprintf(lang['apifailure'], api)); return; }
  if (loadedAPI !== api) {
    setTimeout(function () { loadTime += 50; waitAndLoad(api, url); }, 50);
    return;
  }
  if (!isScriptLoaded(url[1])) {
    addScript(url[1]);
  }
  loadTime = 0;
  waitAndInit(api);
}

function waitAndInit(api) {
  // wait till main api loads
  if (loadTime > 10000) { loadTime = 0; alert(sprintf(lang['apifailure'], api)); return; }
  try {
    init();
  }
  catch (e) {
    setTimeout(function () { loadTime += 50; waitAndInit(api); }, 50);
    return;
  }
  loadTime = 0;
  zoomToBounds(savedBounds);
  loadTrack(userid, trackid, 0);
  // save current api as default
  setCookie('api', api, 30);
}

function addScript(url) {
  var tag = document.createElement('script');
  tag.setAttribute('type', 'text/javascript');
  tag.setAttribute('src', url);
  if (typeof tag != 'undefined') {
    document.getElementsByTagName('head')[0].appendChild(tag);
  }
}

function isScriptLoaded(url) {
  scripts = document.getElementsByTagName('script');
  for (var i = scripts.length; i--;) {
    // check if url matches src
    var scriptUrl = scripts[i].src.replace(/https?:/, '');
    if (scriptUrl != '' && url.indexOf(scriptUrl) !== -1) return true;
  }
  return false;
}

function setCookie(name, value, days) {
  if (days) {
    var date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    var expires = '; expires=' + date.toGMTString();
  }
  else {
    var expires = '';
  }
  document.cookie = 'ulogger_' + name + '=' + value + expires + '; path=/';
}

function setLang(lang) {
  setCookie('lang', lang, 30);
  location.reload();
}

function setUnits(unit) {
  units = unit;
  setCookie('units', unit, 30);
  location.reload();
}

function showModal(contentHTML) {
  var div = document.createElement('div');
  div.setAttribute('id', 'modal');
  div.innerHTML = '<div id="modal-header"><button type="button" onclick="removeModal()"><img alt="' + lang['close'] + '" src="images/close.svg"></button></div><div id="modal-body"></div>';
  document.body.appendChild(div);
  var modalBody = document.getElementById('modal-body');
  modalBody.innerHTML = contentHTML;
}

function removeModal() {
  document.body.removeChild(document.getElementById('modal'));
}

function userMenu() {
  var dropdown = document.getElementById('user_dropdown');
  if (dropdown.classList.contains('show')) {
    dropdown.classList.remove('show');
  } else {
    dropdown.classList.add('show');
    window.addEventListener('click', removeOnClick, true);
  }
}

function removeOnClick(event) {
  var parent = event.target.parentElement;
  var dropdown = document.getElementById('user_dropdown');
  dropdown.classList.remove('show');
  window.removeEventListener('click', removeOnClick, true);
  if (!parent.classList.contains('dropdown')) {
    event.stopPropagation();
  }
}

// naive approach, only %s, %d supported
function sprintf() {
  var args = Array.prototype.slice.call(arguments);
  var format = args.shift();
  var i = 0;
  return format.replace(/%%|%s|%d/g, function(match) {
    if (match == '%%') { return '%'; }
    return (typeof args[i] != 'undefined') ? args[i++] : match;
  });
};

function htmlEncode(s) {
  return s.replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
}

if (!String.prototype.trim) {
  String.prototype.trim = function () {
    return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
  };
}