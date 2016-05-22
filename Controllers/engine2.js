(function() {

    // Angular stuff

    var app = angular.module('runningBob', []); // main angularJS variable

    app.controller('GameController', function(){
        this.addGreenBall = function() {
            var ball = new physics.Body({
                color:"green", 
                shape: "circle", 
                border: "black", 
                x:(Math.random()*canvasWidth)/physics.scale, 
                y:Math.random()*(canvasHeight/2)/physics.scale, 
                radius: 0.5 + Math.random()
            });
        };
        this.addRedRectangle = function() {
                var rec = new physics.Body({
                    type: "static",
                    color:"red", 
                    border:"black", 
                    x:physics.toPixel(0.2,canvasWidth),
                    y:physics.toPixel(0.8,canvasHeight), 
                    height:physics.toPixel(0.05,canvasHeight), 
                    width:physics.toPixel(0.3,canvasWidth)
                })

            var rectangle = new physics.Body({
                color:"red", 
                border:"black", 
                x:(Math.random()*canvasWidth)/physics.scale, 
                y:Math.random()*(canvasHeight/2)/physics.scale, 
                height: 0.5 + Math.random(), 
                width: 0.5 + Math.random()
            });
        };
        this.addToon = function() {
            var toon = new physics.Body({
                color: "green", 
                border: "black", 
                shape: "circle",
                x: physics.toPixel(0.2,canvasWidth), 
                y: physics.toPixel(0.2,canvasHeight), 
                radius: physics.toPixel(0.02, canvasWidth),
                vx: physics.toPixel(0.5,canvasWidth),
                friction: 0
            });
        };
        this.mousePlacing = function() {
            // We create a new grey rectangle and bind it to the mouse to be placed with another click on the canvas
            // See the callbacks defined at the end
            var mouseElement = new physics.Body({
                color: "grey", 
                border: "black", 
                x: currentMousePos.meterX, 
                y: currentMousePos.meterY, 
                height: 1, 
                width: 3,
            });
            var jointDefinition = new Box2D.Dynamics.Joints.b2MouseJointDef();
            jointDefinition.bodyA = physics.world.GetGroundBody();
            jointDefinition.bodyB = mouseElement.body;
            jointDefinition.target = {x: currentMousePos.meterX, y: currentMousePos.meterY};
            jointDefinition.maxForce = 100000;
            jointDefinition.collideConnected = true;
            jointDefinition.dampingRation = 0;
            currentMouseJoint = physics.world.CreateJoint(jointDefinition);
        };
    });


    // Global variables

    var canvas;
    var canvasWidth;
    var canvasHeight;
    var canvasOffset;
    var img = new Image();
    var currentMousePos = { 
        pixelX: -1, 
        pixelY: -1,
        meterX: -1,
        meterY: -1,
    };
    var currentMouseJoint = null;


    // **** Module physics : pour gérer box2d ****
    var physics = function() {

        // We shorten the access names of the box2d variables
        var b2Vec2 = Box2D.Common.Math.b2Vec2;
        var b2BodyDef = Box2D.Dynamics.b2BodyDef;
        var b2Body = Box2D.Dynamics.b2Body;
        var b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
        var b2Fixture = Box2D.Dynamics.b2Fixture;
        var b2World = Box2D.Dynamics.b2World;
        var b2MassData = Box2D.Collision.Shapes.b2MassData;
        var b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
        var b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;
        var b2DebugDraw = Box2D.Dynamics.b2DebugDraw;

        // Création du monde
        // TODO ? We could put a '_' at the begining of private variables
        var gravity = new b2Vec2(0,9.8); // définition du vecteur gravité
        var world = new b2World(gravity, true); // création du monde
        var element = $('#canvas').get(0);
        var context = element.getContext("2d");
        var scale = 30; // l'échelle (combien de pixels/m ?)
        var dtRemaining = 0;
        var stepAmount = 1/60; // pour l'animation fixe (1/60ème de seconde)
        var debugDraw;

        // Ajout des propriétés du framerate fixe. Gère le switch entre le mode débug et le mode normal.
        step = function(dt) {
            dtRemaining += dt;
            while (dtRemaining > stepAmount) {
                dtRemaining -= stepAmount;
                world.Step(stepAmount,8,3);
            }
            if (debugDraw) {
                world.DrawDebugData();
            }
            else {
            context.clearRect(0, 0, element.width, element.height);

            var obj = world.GetBodyList();

            context.save();
            context.scale(scale, scale);
            while (obj) {
                var body = obj.GetUserData();
                if (body) {
                    body.draw(context);
                }

                obj = obj.GetNext();
            }
            context.restore();
            }
        };

        // Déclaration du débug
        var debug = function() {
            debugDraw = new b2DebugDraw();
            debugDraw.SetSprite(context);
            debugDraw.SetDrawScale(scale);
            debugDraw.SetFillAlpha(0.3);
            debugDraw.SetLineThickness(1.0);
            debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
            world.SetDebugDraw(debugDraw);
        };

        // Constructeur pour les objets (rend beaucoup plus simple l'utilisation des classes de Box2D)
        var Body = function(detailsToSet) {
            // Defining defaults
            this.elementDefaults = {
                shape: "block",
                width: 5,
                height: 5,
                radius: 2.5
            };
            this.fixtureDefaults = {
                density: 2,
                friction: 0,
                restitution: 0.2
            };
            this.definitionDefaults = {
                active: true,
                allowSleep: true,
                angle: 0,
                angularVelocity: 0,
                awake: true,
                bullet: false,
                fixedRotation: false
            };
            this.details = detailsToSet || {};
            if (this.details.x === "center")
                this.details.x = canvasWidth / 2 / scale;
            if (this.details.y === "center")
                this.details.y = canvasHeight / 2 / scale;
            if (this.details.y === "floor")
                this.details.y = (canvasHeight / scale) - (this.details.height / 2);

            // Créer la définition
            this.definition = new b2BodyDef();

            // "Définir" la définition
            for (var k in this.definitionDefaults) {
                this.definition[k] = this.details[k] || this.definitionDefaults[k];
            }
            this.definition.position = new b2Vec2(this.details.x || 0, this.details.y || 0);
            this.definition.linearVelocity = new b2Vec2(this.details.vx || 0, this.details.vy || 0);
            this.definition.userData = this;
            this.definition.type = this.details.type == "static" ? b2Body.b2_staticBody : b2Body.b2_dynamicBody;

            // Création des éléments
            this.body = physics.world.CreateBody(this.definition);

            // Création des fixtures
            this.fixtureDef = new b2FixtureDef();
            this.fixtureDef.density = this.details.density || this.fixtureDefaults.density;
            this.fixtureDef.friction = this.details.friction || this.fixtureDefaults.friction;
            this.fixtureDef.restitution = this.details.restitution || this.fixtureDefaults.restitution;


            this.details.shape = this.details.shape || this.elementDefaults.shape;

            switch (this.details.shape) {
                case "circle":
                    this.details.radius = this.details.radius || this.elementDefaults.radius;
                    this.fixtureDef.shape = new b2CircleShape(this.details.radius);
                    break;
                case "polygon":
                    this.fixtureDef.shape = new b2PolygonShape();
                    this.fixtureDef.shape.SetAsArray(this.details.points, this.details.points.length);
                    break;
                // case "block":
                default:
                    this.details.width = this.details.width || this.elementDefaults.width;
                    this.details.height = this.details.height || this.elementDefaults.height;

                    this.fixtureDef.shape = new b2PolygonShape();
                    this.fixtureDef.shape.SetAsBox(this.details.width / 2,
                    this.details.height / 2);
                    break;
            }

            this.body.CreateFixture(this.fixtureDef);


            // Gestion de l'apparence en jeu (utilisation du contexte du canvas)
            this.draw = function(context) {
                var pos = this.body.GetPosition();
                var angle = this.body.GetAngle();
                var points;
                var i;

                context.save();

                context.translate(pos.x, pos.y); // Translation et rotation
                context.rotate(angle);

                if (this.details.color) {      // Dessine la forme, si on désire mettre une couleur
                    context.fillStyle = this.details.color;

                    switch (this.details.shape) {
                        case "circle":
                            context.beginPath();
                            context.arc(0, 0, this.details.radius, 0, Math.PI * 2);
                            context.fill();
                            break;
                        case "polygon":
                            points = this.details.points;
                            context.beginPath();
                            context.moveTo(points[0].x, points[0].y);
                            for (i = 1; i < points.length; i++) {
                                context.lineTo(points[i].x, points[i].y);
                            }
                            context.fill();
                            break;
                        case "block":
                            context.fillRect(-this.details.width / 2, -this.details.height / 2,
                            this.details.width,
                            this.details.height);
                            break;
                        default:
                            break;
                    }
                }

                if (this.details.image) { // Remplit à l'aide d'une image si on le désire
                    context.drawImage(this.details.image, -this.details.width / 2, -this.details.height / 2,
                    this.details.width,
                    this.details.height);

                }

                if (this.details.border) {
                    context.strokeStyle = this.details.border;
                    context.lineWidth = this.details.borderWidth || 1/30;
                    switch (this.details.shape) {
                        case "circle":
                            context.beginPath();
                            context.arc(0, 0, this.details.radius, 0, Math.PI * 2);
                            context.stroke();
                            break;
                        case "polygon":
                            points = this.details.points;
                            context.beginPath();
                            context.moveTo(points[0].x, points[0].y);
                            for (i = 1; i < points.length; i++) {
                                context.lineTo(points[i].x, points[i].y);
                            }
                            context.stroke();
                            break;
                        case "block":
                            context.strokeRect(-this.details.width / 2, -this.details.height / 2,
                            this.details.width,
                            this.details.height);
                            break;
                        default:
                            break;
                    }
                }
                context.restore();
            };
        };


        //La fonction permettant le drag & drop
        var dragNDrop = function () {
            var obj = null;
            var joint = null;

            function calculateWorldPosition(e) {    // On calcule la position de l'élément, converti en mètres
                return {
                    x: (e.offsetX || e.layerX) / scale,
                    y: (e.offsetY || e.layerY) / scale
                };
            }

            element.addEventListener("mousedown", function (e) {       // On chope l'élément en question avec QueryPoint (déjà utilisé lors du Physics.click)
                e.preventDefault();
                var point = calculateWorldPosition(e);
                world.QueryPoint(function (fixture) {
                    obj = fixture.GetBody().GetUserData();
                }, point);
                if (obj) {
                    obj.body.SetType("static");
                }
            });

            element.addEventListener("mousemove", function (e) {       // Lorsqu'on bouge la souris, on bouge l'élément
                if (!obj) {
                    return;
                }
                obj.body.SetType("static");
                var point = calculateWorldPosition(e);

                if (!joint) {
                    var jointDefinition = new Box2D.Dynamics.Joints.b2MouseJointDef();

                    jointDefinition.bodyA = world.GetGroundBody();
                    jointDefinition.bodyB = obj.body;
                    jointDefinition.target.Set(obj.body.GetWorldCenter().x, obj.body.GetWorldCenter().y);
                    jointDefinition.maxForce = 100000;
                    jointDefinition.timeStep = stepAmount;
                    joint = world.CreateJoint(jointDefinition);
                }

                joint.SetTarget(new b2Vec2(point.x, point.y));
            });

            element.addEventListener("mouseup", function (e) {     // Lorsqu'on lache le clic, on détruit le lien en supprimant la vitesse de l'objet
                if (obj) {
                    obj.body.SetLinearVelocity({x:0,y:0});
                    obj.body.SetType(0);
                    alert(obj.body.GetType());
                }
                obj = null;
                if (joint) {
                    world.DestroyJoint(joint);
                    joint = null;
                }

            });
        };

        var toPixel = function(pos, hw) {
            return (pos*hw)/scale;
        };

        // We return all the variables and function that we want to make accessible from outside the module !
        return {
            scale: scale,
            element: element,
            context: context,
            world: world,
            Body: Body,

            dragNDrop: dragNDrop,
            step: step,
            debug: debug,
            toPixel: toPixel,
        };
    }();

    // We inform the page that we want to use the RequestAnimationFrame method for the display (more efficient)
    window.requestAnimFrame = (function(){
        return  window.requestAnimationFrame       || 
                window.webkitRequestAnimationFrame || 
                window.mozRequestAnimationFrame    || 
                window.oRequestAnimationFrame      || 
                window.msRequestAnimationFrame     || 
                function(/* function */ callback, /* DOMElement */ element){
                    window.setTimeout(callback, 1000 / 60);
                };
    })();

    var lastFrame = new Date().getTime();

    // gameLoop permet de gérer le focus ou non sur le jeu en cas d'alt+tab, en parallèle de requestAnimationFrame. 
    window.gameLoop = function() {
        var tm = new Date().getTime();
        requestAnimationFrame(gameLoop);
        var dt = (tm - lastFrame) / 1000;
        if(dt > 1/15) { dt = 1/15; }
        physics.step(dt);
        lastFrame = tm;
    };

    // Everytime the mouse moves anywhere on the window, we get its position
    $(document).mousemove(function(event) {
        currentMousePos.pixelX = event.pageX;
        currentMousePos.pixelY = event.pageY;
        currentMousePos.meterX = (currentMousePos.pixelX - canvasOffset.left) / physics.scale;
        currentMousePos.meterY = (currentMousePos.pixelY - canvasOffset.top) / physics.scale;
        if (currentMouseJoint)
            currentMouseJoint.SetTarget({x: currentMousePos.meterX, y: currentMousePos.meterY});
    });

    // If we click on the canvas with a joint element, it drops it
    $('#canvas').click(function(event) {
        if(currentMouseJoint) {
            physics.world.DestroyJoint(currentMouseJoint);
            currentMouseJoint = null;
        }
    });

    // CREATION DES ELEMENTS DES DIFFERENTS NIVEAUX, A METTRE DANS UN FICHIER A PART POUR CHAQUE NIVEAU PLUS TARD
    $(document).ready(function() {
        canvas = $('#canvas');
        // we set the canvas' height and width here so that the physics world size scales with the size of the canvas' container
        canvas.get(0).width = canvas.parent().width();
        canvas.get(0).height = canvas.parent().height();
        canvasWidth = canvas.width();
        canvasHeight = canvas.height();
        canvasOffset = canvas.offset();

        //var block1 = new physics.Body({type: "static", color:"red", border:"black", x: 15, y:physics.toPixel(0.8,canvasHeight), height: (0.1*canvasHeight)/physics.scale, width: (0.3*canvasWidth)/physics.scale});
        //var block2 = new physics.Body({type: "static", color:"red", border:"black", x:40, y:physics.toPixel(0.8,canvasHeight)});
        

        physics.dragNDrop();
        // physics.debug();
        requestAnimationFrame(gameLoop);
        img.src = "./Resources/Landscape/herbe.jpg";
    });
})();
