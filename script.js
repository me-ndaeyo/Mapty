'use strict';

const sideBar = document.querySelector('.sidebar');
const form = document.querySelector('.form');
const formBtnBox = document.querySelector('.form__btn-box')
const enter = document.querySelector('.form__btn-enter');
const cancel = document.querySelector('.form__btn-cancel');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const editBtn = document.querySelector('.workout__edit');
const deleteBtn = document.querySelector('.workout__delete');
const deleteAll = document.querySelector('.delete__all');
const sortAll = document.querySelector('.sort__all');
const menuOpen = document.querySelector('.open');
const menuClose = document.querySelector('.close');
let overlay, modal, marker;

// Workout class
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    this.description = `${this.type[0].toUpperCase()}${this.type
      .slice(1)
      .toLowerCase()} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  _countClicks() {
    this.clicks++;
  }
}

// Running class
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

// Cycling class
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// App class
class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 14;
  #workouts = [];

  constructor() {
    // Get user location
    this._getPosition();

    // Get  data from local storage
    this._getLocalStorage();

    // Event listeners
    // form.addEventListener('submit', this._newWorkout.bind(this));
    menuOpen.addEventListener('click', this._showSidebar)
    enter.addEventListener('click', this._newWorkout.bind(this));
    cancel.addEventListener('click', this._hideForm.bind(this));
    inputType.addEventListener('change', this._elevationFieldToggle);
    containerWorkouts.addEventListener('click', this._moveToMarker.bind(this));
    sideBar.addEventListener('click', this._edit.bind(this));
    deleteAll.addEventListener('click', this._showOverlay.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          console.log(`Could not get location`);
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    // // Leaflet plugin
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));
    // Rendering workout list from local storage on map load
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showSidebar(){
    sideBar.classList.toggle('show');
  }

  _edit(e) {
    // // Listen for edit button click
    if (e.target.classList.contains('workout__edit')) {
      const values = e.target.closest('.workout').querySelectorAll('.workout__value');
    //   Show form
      this._showForm();
      for (const val of values) {
        inputType.addEventListener('change', this._elevationFieldToggle);
        if (val.closest('.workout__details').dataset.id === 'duration')
          inputDuration.value = val.textContent;
        if (val.closest('.workout__details').dataset.id === 'distance')
          inputDistance.value = val.textContent;
        if (val.closest('.workout__details').dataset.id === 'cadence')
          inputCadence.value = val.textContent;
        if (val.closest('.workout__details').dataset.id === 'elevation')
          inputElevation.value = val.textContent;
      }

      if (e.target.closest('.workout').classList.contains('workout--cycling')) {
        inputType.value = 'cycling';
        inputCadence.closest('.form__row').classList.add('form__row--hidden');
        inputElevation
          .closest('.form__row')
          .classList.remove('form__row--hidden');
      }

      if (e.target.closest('.workout').classList.contains('workout--running')) {
        inputType.value = 'running';
        inputElevation.closest('.form__row').classList.add('form__row--hidden');
        inputCadence
          .closest('.form__row')
          .classList.remove('form__row--hidden');
      }

      // Hide existing button and replace it with a new button
      enter.style.display = 'none';
      const confirmBtn = document.createElement('div');
      confirmBtn.className = 'form__btn';
      confirmBtn.textContent = 'Confirm';
    
    
    
      //   Adding event listener to new button
      confirmBtn.addEventListener('click', () => {
        // Find the target object
        const test = this.#workouts.findIndex(el => el.id === e.target.closest('.workout').dataset.id);
        // Reset the values
        this.#workouts[test].type = inputType.value;
        this.#workouts[test].distance = Number.parseFloat(inputDistance.value);
        this.#workouts[test].duration = Number.parseFloat(inputDuration.value);
        if (this.#workouts[test].type === 'running') {
          this.#workouts[test].cadence = Number.parseFloat(inputCadence.value);
          this.#workouts[test].pace =
            this.#workouts[test].duration / this.#workouts[test].distance;
        }
        if (this.#workouts[test].type === 'cycling') {
          this.#workouts[test].elevation = Number.parseFloat(
            inputElevation.value
          );
          this.#workouts[test].speed =
            this.#workouts[test].distance /
            (this.#workouts[test].duration / 60);
        }
        // update UI list
        document.querySelectorAll('.workout').forEach(el => el.remove());
        this.#workouts.forEach(work => this._renderWorkout(work));
        // Hide form
        this._hideForm();
        // Set local storage
        this._setLocalStorage();
      });

    
    formBtnBox.append(confirmBtn);
    }

    // // Listening for delete button click
    if (e.target.classList.contains('workout__delete')) {
      //   containerWorkouts.removeChild(e.target.closest('.workout'));

      // Remove the current workout from the array
      this.#workouts = this.#workouts.filter(
        work => work.id !== e.target.closest('.workout').dataset.id
      );

      // Remove all workouts from UI list
      document.querySelectorAll('.workout').forEach(el => el.remove());

      // Add updated workouts array elements to the UI list
      this.#workouts.forEach(work => this._renderWorkout(work));

      // Add updated workout array elements to local storage and reload page
      this._setLocalStorage();
      location.reload();
    }
  }



  _showForm(mapE) {
    this.#mapEvent = mapE;
    enter.style.display = 'grid'
    form.classList.remove('hidden');
    this._formValInit();
    inputDistance.focus();
  }

  _hideForm() {
    this._formValInit();
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 500);
  }

  _formValInit() {
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';
    inputCadence.blur();
    inputDistance.blur();
    inputDuration.blur();
    inputElevation.blur();
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const isPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // 1. Get all input data
    const type = inputType.value;
    const distance = Number.parseFloat(inputDistance.value);
    const duration = Number.parseFloat(inputDuration.value);
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // 2. If workout type is running, create running object
    if (type === 'running') {
      const cadence = Number.parseFloat(inputCadence.value);
      if (
        !validInputs(distance, duration, cadence) ||
        !isPositive(distance, duration, cadence)
      )
        return alert('Input is not a positive or valid number!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // 3. If workout type is cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !isPositive(distance, duration)
      )
        return alert('Input is not a positive or valid number!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // 4. Add new object to workout array
    this.#workouts.push(workout);

    // 5. Render workout on map
    this._renderWorkoutMarker(workout);

    // 6. Render workout on list
    this._renderWorkout(workout);

    // Clearing input fields and hiding form
    this._hideForm();

    // Save data to local storage
    this._setLocalStorage();
  }

  _elevationFieldToggle() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _renderWorkoutMarker(workout) {
    if (this.#workouts.includes(workout)) {
      L.marker(workout.coords)
        .addTo(this.#map)
        .bindPopup(
          L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closePopupOnClick: false,
            closeOnClick: false,
            className: `${workout.type}-popup`,
          })
        )
        .setPopupContent(
          `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
        )
        .openPopup();
    }
  }

//   _removeWorkoutMarker() {
//     this.#map.removeLayer(this);
//   }

  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__actions">
            <span class="workout__edit">edit</span>
            <span class="workout__delete">delete</span>
          </div>
          <div class="workout__details" data-id="distance">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details" data-id="duration">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;

    if (workout.type === 'running') {
      html += `
            <div class="workout__details" data-id="pace">
              <span class="workout__icon">⚡️</span>
              <span class="workout__value">${workout.pace.toFixed(1)}</span>
              <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details" data-id="cadence">
              <span class="workout__icon">🦶🏼</span>
              <span class="workout__value">${workout.cadence}</span>
              <span class="workout__unit">spm</span>
            </div>
        </li>`;
    }

    if (workout.type === 'cycling') {
      html += `
            <div class="workout__details" data-id="speed">
              <span class="workout__icon">⚡️</span>
              <span class="workout__value">${workout.speed.toFixed(1)}</span>
              <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details" data-id="elevation">
              <span class="workout__icon">⛰</span>
              <span class="workout__value">${workout.elevation}</span>
              <span class="workout__unit">m</span>
            </div>
        </li>`;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToMarker(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    // Using public interface to count clicks
    workout._countClicks();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    let data = JSON.parse(localStorage.getItem('workouts'));
    console.log(data);
    // Loop over the object
    for (const [key, val] of Object.entries(data)) {
      let workout;

      // Create new objects based on the data given and push to the data array
      if (val.type === 'running') val.__proto__ = Running.prototype
      if (val.type === 'cycling')val.__proto__ = Cycling.prototype
    }
    // Guard clause
    if (!data) return;
        console.log(data)
    // Render workout array elements to the UI
    this.#workouts = data;
    this.#workouts.forEach(work => this._renderWorkout.call(this, work));
  }

  _showOverlay() {
    if (modal) {
      return;
    }

    modal = document.createElement('div');
    modal.className = 'modal';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal__content';

    const modalTitle = document.createElement('h2');
    modalTitle.className = 'modal__title';
    modalTitle.textContent = 'Are you sure you want to delete all activities?';

    const btnClose = document.createElement('button');
    btnClose.className = 'modal__btn modal__btn-close';
    btnClose.textContent = 'No';
    btnClose.addEventListener('click', this._removeOverlay);

    const btnOkay = document.createElement('button');
    btnOkay.className = 'modal__btn modal__btn-ok';
    btnOkay.textContent = 'Yes!';
    btnOkay.addEventListener('click', this.reset);

    modalContent.append(modalTitle);
    modalContent.append(btnClose);
    modalContent.append(btnOkay);

    modal.append(modalContent);

    document.body.append(modal);

    overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.addEventListener('click', this._removeOverlay);

    document.body.append(overlay);
  }

  _removeOverlay() {
    modal.remove();
    modal = null;

    overlay.remove();
    overlay = null;
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();