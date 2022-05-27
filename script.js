var mutchance = 1;
var mutstr = 1;
var objects = []
var agents = []

var frame = 0;
var running = true;
var selected;



class Entity {
  constructor(x, y, r, g, b) {
    this.type = "agent"

    this.x = x;
    this.y = y;

    this.r = r;
    this.g = g;
    this.b = b;

    this.nrg = 1000;
    this.age = 0;
    this.attcr = 0;
    this.attcrs = []

    //input: other.dist, other.r, other.g, other.b, energy, other.energy, attackerdist, this.r, this.g, this.b, fight/flight
    //output: speed, change lock, fight/flight, escapespeed
    //traits: this.r, this.g, this.b

    this.inputl = 11;
    this.outl = 4;
    this.hiddenl = 15;
    this.flight = 0;

    this.input = math.zeros(this.inputl)
    this.hiddenw = math.zeros(this.inputl, this.hiddenl)
    this.hidden = math.zeros(this.hiddenl)
    this.outputw = math.zeros(this.hiddenl, this.outl)
    this.output = math.zeros(this.outl)
    this.bias = math.zeros(this.outl)
  }

  mutateArr(arr) {
    return arr.map(function(value, index) {
      if (Math.random() < mutchance) {
        try {
          arr.subset(math.index(index[0], index[1]), value + ((Math.random() * mutstr * 2) - mutstr))
        } catch {
          arr.subset(math.index(index[0]), value + Math.random())
        }
      }
    })

  }

  sig(arr) {

    arr.forEach(function(value, index) {
      try {
        arr.subset(math.index(index[0], index[1]), Math.tanh(value))
      } catch {
        arr.subset(math.index(index[0]), Math.tanh(value))
      }

    })

  }

  mutAll() {

    this.mutateArr(this.hiddenw)
    this.mutateArr(this.outputw)
    this.mutateArr(this.bias)

  }

  solve() {

    //input: other.dist, other.r, other.g, other.b, energy, other.energy, attackerdist, this.r, this.g, this.b
    this.input.subset(math.index(0), getDist(this.x, this.y, this.lock.x, this.lock.y))
    this.input.subset(math.index(1), this.lock.r)
    this.input.subset(math.index(2), this.lock.g)
    this.input.subset(math.index(3), this.lock.b)
    this.input.subset(math.index(4), this.nrg)
    this.input.subset(math.index(5), this.lock.nrg)

    if (this.attcr !== 0) {
      this.input.subset(math.index(6), getDist(this.x, this.y, this.attcr.x, this.attcr.y))
    } else {
      this.input.subset(math.index(6), 512)
    }

    this.input.subset(math.index(7), this.r)
    this.input.subset(math.index(8), this.g)
    this.input.subset(math.index(9), this.b)
    this.input.subset(math.index(10), this.flight)

    this.hidden = math.multiply(this.input, this.hiddenw)
    this.sig(this.hidden)
    this.output = math.add(math.multiply(this.hidden, this.outputw), this.bias)
    this.sig(this.output)
  }

  reproduce() {

    var newAgent = new Entity(this.x + r(40) - r(20), this.y + r(40) - r(20), this.r + (r(20) - 10), this.g + (r(20) - 10), this.b + (r(20) - 10))
    newAgent.hiddenw = this.hiddenw
    newAgent.outputw = this.outputw
    newAgent.bias = this.bias

    newAgent.mutAll()

    objects.push(newAgent)
    agents.push(newAgent)
  }

  rot() {
    splat(this.x, this.y, this.r / 2, this.g / 2, this.b / 2)
    objects.push(new Food(this.x, this.y))
    this.lock.attcrs.splice(this.lock.attcrs.indexOf(this), 1)

    
    objects.splice(objects.indexOf(this), 1)
    agents.splice(agents.indexOf(this), 1)
  }

  update() {
    if (this.attcrs.length > 0) {
      this.attcr = this.attcrs[0]
      for (let m = 0; m < this.attcrs.length; m++) {
        if (getDist(this.x, this.y, this.attcrs[m].x, this.attcrs[m].y) < getDist(this.x, this.y, this.attcr.x, this.attcr.y)) {
          this.attcr = this.attcrs[m]
        }
      }

    }
    this.age += 1;
    if (objects.length == 1) {
      console.log("End")

    }
    if (objects.includes(this.lock) == false || this.lock.age < 50) {
      this.lockOn()
    }
    this.solve()
    var scale = math.subset(this.output, math.index(0))
    var cgLock = math.subset(this.output, math.index(1))
    this.flight = math.subset(this.output, math.index(2))
    var escscale = math.subset(this.output, math.index(3))

    if (cgLock > 0) {
      this.lockOn()
    }

    if (getDist(this.x, this.y, this.lock.x, this.lock.y) < 10 && this.lock.age > 150 && this.flight < 0) {
      splat(this.lock.x, this.lock.y, 150, 0, 0)
      this.nrg += this.lock.nrg

      if (this.lock.type == "agent") {

        objects.splice(objects.indexOf(this.lock), 1)
        agents.splice(agents.indexOf(this.lock), 1)
        if (this.lock.lock.attcrs !== undefined) {
          this.lock.lock.attcrs.splice(this.lock.lock.attcrs.indexOf(this.lock), 1);
        }

        this.reproduce()

      } else if (this.lock.type == "food") {
        objects.splice(objects.indexOf(this.lock), 1)
        this.reproduce()
      } else {
        this.rot()
      }

    }

    if (this.nrg < 0) {
      this.rot()
    }

    if (this.flight < 0) {
      this.x -= ((this.x - this.lock.x) / getDist(this.x, this.y, this.lock.x, this.lock.y)) * scale

      this.y -= ((this.y - this.lock.y) / getDist(this.x, this.y, this.lock.x, this.lock.y)) * scale
    } else if (this.attcr !== 0 && this.flight > 0) {
      this.x -= ((this.x - this.attcr.x) / getDist(this.x, this.y, this.attcr.x, this.attcr.y)) * escscale

      this.y -= ((this.y - this.attcr.y) / getDist(this.x, this.y, this.attcr.x, this.attcr.y)) * escscale
    } 
    if (getDist(this.x, this.y, this.lock.x, this.lock.y) < 5) {
      this.x += ((this.x - this.lock.x) / getDist(this.x, this.y, this.lock.x, this.lock.y)) * scale
      this.y += ((this.y - this.lock.y) / getDist(this.x, this.y, this.lock.x, this.lock.y)) * scale
    }


    //this.nrg -= Math.abs(Math.pow(scale * 2, 2)) / 128;

    if (this.x > 512) {
      this.x -= 20;
    }
    if (this.y > 512) {
      this.y -= 20;
    }
    if (this.x < 0) {
      this.x += 20;
    }
    if (this.y < 0) {
      this.y += 20;
    }
    //this.nrg -= 1;

  }

  draw() {

    if (this.flight > 0) {
      fill(this.attcr.r * 2, this.attcr.g / 2, this.attcr.b / 2)
      ellipse(this.x, this.y, 11, 11)
    }

    fill(this.r, this.g, this.b)
    ellipse(this.x, this.y, 10, 10)

    if (this.lock !== undefined) {
      fill(this.lock.r, this.lock.g, this.lock.b)
      ellipse(this.x, this.y, 5, 5)
    } else {
      this.lockOn()
    }

  }

  lockOn() {
    this.lock = objects[Math.floor(Math.random() * objects.length)]
      if (this.lock == this) {
        this.lockOn()
      } else {
        this.lock.attcrs.push(this);
      }

  }
}

class Trap {
  constructor(x, y) {
    this.type = "trap"
    this.x = x;
    this.y = y;

    this.r = 200;
    this.g = 0;
    this.b = 200;

    this.nrg = 0;
    this.age = 100;

    this.attcrs = []


  }

  update() {
    this.age += 1;
  }

  draw() {
    fill(this.r, this.g, this.b)
    rect(this.x, this.y, 10, 10)

  }

}

class Food {
  constructor(x, y) {
    this.type = "food"
    this.x = x;
    this.y = y;

    this.r = 0;
    this.g = 200;
    this.b = 0;

    this.nrg = 1000;
    this.attcrs = []
    this.age = 100 + r(500);

  }

  update() {
    this.age += 1;
    /*if (this.age >= (1000)) {
      splat(this.x, this.y, 255, 255, 255)
      var newAgent = new Entity(this.x, this.y, r(255), r(255), r(255));
      objects.push(newAgent)
      agents.push(newAgent)
      newAgent.lockOn()
      newAgent.mutAll()
      objects.splice(objects.indexOf(this), 1)
      agents.splice(agents.indexOf(this), 1)
    }*/
  }

  draw() {
    fill(this.r, this.g, this.b)
    rect(this.x, this.y, 5, 5)

  }

}

function splat(x, y, r, g, b) {
  fill(r, g, b)

  ellipse(x, y, 13, 13)

  for (var p = 0; p < 10; p++) {
    let z = 5 * Math.random();
    ellipse(x + ((Math.random() * 30) - 15), y + ((Math.random() * 30) - 15), z, z)
  }
}

function getDist(x, y, ox, oy) {
  return Math.hypot(y - oy, x - ox)
}

function r(r) {
  return Math.floor(Math.random() * r)
}


for (i = 0; i < 100; i++) {
  let x = new Entity(r(512), r(512), r(255), r(255), r(255))
  objects.push(x)
  agents.push(x)
}

for (i = 0; i < 0; i++) {
  objects.push(new Trap(r(512), r(512)))
}

for (i = 0; i < 0; i++) {
  objects.push(new Food(r(512), r(512)))
}

for (let i = 0; i < objects.length; i++) {
  try {
    objects[i].lockOn()
    objects[i].mutAll()
  } catch {

  }

}

mutchance = 0.5
mutstr = 0.2

function setup() {
  var width = 512;
  var height = 512;

  cnvs = createCanvas(width, height)
  cnvs.parent('cnvs');
  background(50, 50, 100);
  noStroke()
  frameRate(50);
}

function draw() {

  //document.getElementById("pop").innerHTML = "Population: " + (agents.length) + "<br>Alive %: " + Math.round((agents.length / objects.length) * 100)
  frame++;
  if (running && frame % 1 == 0) {
    
    background('rgba(50, 50, 100, 0.2)')
    for (var i = 0; i < objects.length; i++) {
      objects[i].update()
      if (objects.includes(objects[i])) {
        objects[i].draw()
      }

    }
  }
}

/*
function mouseClicked() {
  for (var q = 0; q < objects.length; q++) {
    if (getDist(mouseX, mouseY, objects[q].x, objects[q].y) <= 30) {
      document.getElementById("energy").innerHTML = "Energy: " + Math.round(objects[q].nrg);
      objects.splice(q, 1)
      agents.splice(q, 1)
      break
    }
  }
}
  <!-->
  <p id=pop>Population: </p>
  <h1>Current Agent:</h1>
  (Click an agent to select it)
  <br>
  <p id=energy>Energy: </p>
    </!-->
*/