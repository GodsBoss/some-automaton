window.addEventListener('load', init, false);

function init(e) {
  const canvas = e.target.getElementById('grid')
  canvas.width = 1600
  canvas.height = 800
  canvas.style.border = "1px solid black"
  const ctx2D = canvas.getContext('2d')
  const imageDataObj = ctx2D.createImageData(canvas.width, canvas.height)
  const sim = new Simulation(
    {
      size: {width: 320, height: 160},
      variance: 4,
      mutation: {
        attempts: 1,
      },
      fight: {
        attempts: 10000,
      },
    },
  )
  sim.setGridChangeCallback(
    (grid) => {
      fillImageDataObjWithGrid(grid, imageDataObj)
      ctx2D.putImageData(imageDataObj, 0, 0)
    },
  )
  sim.initialize()
  sim.start()
  const gui = new GUI(e.target, e.target.getElementById('settings'))
  gui.initialize(sim)
}

function fillImageDataObjWithGrid(grid, imageDataObj) {
  // The scale factors determine how the image data position is scaled to the
  // grid cell position.
  const hScale = grid.getSize().width / imageDataObj.width
  const vScale = grid.getSize().height / imageDataObj.height

  for(let x = 0; x < imageDataObj.width; x++) {
    for(let y = 0; y < imageDataObj.height; y++) {
      let offset = (y * imageDataObj.width + x) * 4
      let cell = grid.getCell(
        {
          x: Math.floor(x * hScale),
          y: Math.floor(y * vScale),
        }
      )
      imageDataObj.data[offset+0] = Math.floor(cell.power[0] * 255 / 9)
      imageDataObj.data[offset+1] = Math.floor(cell.power[1] * 255 / 9)
      imageDataObj.data[offset+2] = Math.floor(cell.power[2] * 255 / 9)
      imageDataObj.data[offset+3] = 255
    }
  }
}

class Grid {
  constructor (size, initCell) {
    this.size = size
    this.cells = []
    for(let x = 0; x < size.width; x++) {
      for(let y = 0; y < size.height; y++) {
        this.cells[this.fieldIndex({x: x, y: y})] = initCell(x, y)
      }
    }
  }

  getSize() {
    return this.size
  }

  fieldIndex(pos) {
    return pos.y * this.size.width + pos.x
  }

  getCell(pos) {
    return this.cells[this.fieldIndex(pos)]
  }

  setCell(pos, cell) {
    this.cells[this.fieldIndex(pos)] = cell
  }

  neighbours(pos) {
    return gridNeighbourOffsets.map(
      (offset) => ({
          x: (pos.x + offset.x + this.size.width) % this.size.width,
          y: (pos.y + offset.y + this.size.height) % this.size.height,
      }),
    )
  }
}

const gridNeighbourOffsets = [
  {
    x: 1,
    y: 0
  },
  {
    x: -1,
    y: 0,
  },
  {
    x: 0,
    y: 1,
  },
  {
    x: 0,
    y: -1,
  },
]

function createCell(x, y) {
  return {
    power: [
      5, 5, 5,
    ]
  }
}

function createRandomCell(variance) {
  const initialPowerValue = 5 - variance
  const startRemaining = 15 - (3 * initialPowerValue)
  return function(x, y) {
    const power = [initialPowerValue, initialPowerValue, initialPowerValue]
    let remaining = startRemaining
    while(remaining>0) {
      let index = randomInt(0, 3)
      if(power[index] < 9) {
        power[index]++
        remaining--
      }
    }
    return {
      power: power,
    }
  }
}

class Mutation {
  constructor (attempts) {
    this.attempts = attempts
    this.mutations = [
      {
        up: 0,
        down: 1,
      },
      {
        up: 0,
        down: 2,
      },
      {
        up: 1,
        down: 0,
      },
      {
        up: 1,
        down: 2,
      },
      {
        up: 2,
        down: 0,
      },
      {
        up: 2,
        down: 1,
      },
    ]
  }

  mutate(grid) {
    for(let i=0; i<this.attempts; i++) {
      const currentCell = grid.getCell(randomPosition(grid))
      const mutation = randomArrayItem(this.mutations)
      const newPower = currentCell.power.slice(0)
      newPower[mutation.up]++
      newPower[mutation.down]--
      if (validPower(newPower)) {
        currentCell.power = newPower
      }
    }
  }
}

function validPower(power) {
  for(let i=0; i<power.length; i++) {
    if(power[i]<1 || power[i]>9) {
      return false
    }
  }
  return true
}

function randomArrayItem(arr) {
  return arr[randomInt(0, arr.length)]
}

// randomFromTo returns a random integer i with min <= i < max.
function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min))
}

class Fight {
  constructor(attempts) {
    this.attempts = attempts
  }

  fight(grid) {
    for(let i=0; i<this.attempts; i++) {
      this.singleFight(grid)
    }
  }

  singleFight(grid) {
    const pos1 = randomPosition(grid)
    const pos2 = randomArrayItem(grid.neighbours(pos1))
    const cell1 = grid.getCell(pos1)
    const cell2 = grid.getCell(pos2)
    let pos1Adv = 0
    let pos2Adv = 0
    for(let i=0; i < 3; i++) {
      if (cell1.power[i] > cell2.power[i]) {
        pos1Adv++
      }
      if (cell1.power[i] < cell2.power[i]) {
        pos2Adv++
      }
    }
    if (pos1Adv > pos2Adv) {
      this.replace(grid, pos2, cell1)
    }
    if (pos1Adv < pos2Adv) {
      this.replace(grid, pos1, cell2)
    }
  }

  replace(grid, loserPos, winnerCell) {
    grid.setCell(loserPos, { power: winnerCell.power.slice(0)})
  }
}

function randomPosition(grid) {
  return {
    x: randomInt(0, grid.getSize().width),
    y: randomInt(0, grid.getSize().height),
  }
}

class Simulation {
  constructor(cfg) {
    this.cfg = cfg
    this.running = false
    this.gridChangeCallback = (grid) => {}
  }

  initialize() {
    this.mutation = new Mutation(this.cfg.mutation ? this.cfg.mutation.attempts : 1)
    this.fight = new Fight(this.cfg.fight ? this.cfg.fight.attempts : 0)
    this.grid = new Grid(this.cfg.size, createRandomCell(this.cfg.variance))
  }

  getGrid() {
    return this.grid
  }

  reset() {
    this.grid = new Grid(this.cfg.size, createRandomCell(this.cfg.variance))
    this.gridChangeCallback(this.getGrid())
  }

  next() {
    if(!this.running) {
      return
    }
    setTimeout(
      () => {
        this.next()
      },
      25
    )
    this.step()
  }

  step() {
    this.mutation.mutate(this.grid)
    this.fight.fight(this.grid)
    this.gridChangeCallback(this.getGrid())
  }

  setGridChangeCallback(callback) {
    this.gridChangeCallback = callback
  }

  start() {
    if(this.running) {
      return
    }
    this.running = true
    this.next()
  }

  stop() {
    this.running = false
  }
}

class GUI {
  constructor(document, parent) {
    this.document = document
    this.parent = parent
  }

  initialize(sim) {
    const buttons = this.document.createElement('div')
    buttons.appendChild(this.newButton('Reset', ()=>{ sim.reset() }))
    buttons.appendChild(this.newButton('Start', ()=>{ sim.start() }))
    buttons.appendChild(this.newButton('Stop', ()=>{ sim.stop() }))
    this.parent.appendChild(buttons)
  }

  newButton(label, callback){
    const button = this.document.createElement('button')
    button.appendChild(this.document.createTextNode(label))
    button.addEventListener('click', callback, false)
    return button
  }
}
