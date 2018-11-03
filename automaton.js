window.addEventListener('load', init, false);

function init(e) {
  const canvas = e.target.getElementById('grid')
  canvas.width = 800
  canvas.height = 600
  canvas.style.border = "1px solid black"
  const ctx2D = canvas.getContext('2d')
  const imageDataObj = ctx2D.createImageData(800, 600)
  let grid = new Grid({width: 40, height: 30}, createCell)
  let mutation = new Mutation(100)
  tick(
    function() {
      mutation.mutate(grid)
      fillImageDataObjWithGrid(grid, imageDataObj)
      ctx2D.putImageData(imageDataObj, 0, 0)
    },
    100
  )
}

function tick(f, interval) {
  var g = function() {
    setTimeout(g, interval)
    f()
  }
  g()
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
}

function createCell(x, y) {
  return {
    power: [
      5, 5, 5,
    ]
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
      const x = randomInt(0, grid.getSize().width)
      const y = randomInt(0, grid.getSize().height)
      const currentCell = grid.getCell({x, y})
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
