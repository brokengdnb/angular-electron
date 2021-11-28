import { Component, OnInit } from '@angular/core';
import { AuthService } from '../_services/auth.service';
import { TokenStorageService } from '../_services/token-storage.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import {Container, Main} from 'tsparticles';


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  form: any = {
    username: null,
    password: null
  };
  isLoggedIn = false;
  isLoginFailed = false;
  errorMessage = '';
  roles: string[] = [];

  constructor(
    private authService: AuthService,
    private tokenStorage: TokenStorageService,
    private snackBarLogin: MatSnackBar,
    private router: Router) { }

  ngOnInit(): void {
    if (this.tokenStorage.getToken()) {
      this.isLoggedIn = true;
      this.roles = this.tokenStorage.getUser().roles;
      this.router.navigate(['/profile']);
    }
  }

  id = 'tsparticles';

  /* Starting from 1.19.0 you can use a remote url (AJAX request) to a JSON with the configuration */
  particlesUrl = 'http://foo.bar/particles.json';

  /* or the classic JavaScript object */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  particlesOptions2 = {
    fpsLimit: 60,
    fullScreen: {
      enable: true
    },
    particles: {
      number: {
        value: 0
      },
      color: {
        value: '#ffffff'
      },
      shape: {
        type: ['circle', 'circle']
      },
      opacity: {
        value: { min: 0, max: 1 },
        animation: {
          enable: true,
          speed: 1,
          startValue: 'max',
          destroy: 'min'
        }
      },
      size: {
        value: { min: 1, max: 3 }
      },
      life: {
        duration: {
          sync: true,
          value: 7
        },
        count: 1
      },
      move: {
        enable: true,
        gravity: {
          enable: true
        },
        drift: {
          min: -2,
          max: 2
        },
        speed: { min: 10, max: 30 },
        decay: 0.1,
        direction: 'none',
        random: false,
        straight: false,
        outModes: {
          default: 'destroy',
          top: 'none'
        }
      },
      rotate: {
        value: {
          min: 0,
          max: 360
        },
        direction: 'random',
        move: true,
        animation: {
          enable: true,
          speed: 60
        }
      },
      tilt: {
        direction: 'random',
        enable: true,
        move: true,
        value: {
          min: 0,
          max: 360
        },
        animation: {
          enable: true,
          speed: 60
        }
      },
      roll: {
        darken: {
          enable: true,
          value: 25
        },
        enable: true,
        speed: {
          min: 15,
          max: 25
        }
      },
      wobble: {
        distance: 30,
        enable: true,
        move: true,
        speed: {
          min: -15,
          max: 15
        }
      }
    },
    detectRetina: true,
    background: {
      color: '#000000'
    },
    emitters: {
      direction: 'none',
      spawnColor: {
        value: 'red',
        animation: {
          l: {
            enable: true,
            offset: {
              min: 0,
              max: 100
            },
            speed: 0,
            sync: false
          }
        }
      },
      life: {
        count: 0,
        duration: 0.1,
        delay: 0.6
      },
      rate: {
        delay: 0.1,
        quantity: 100
      },
      size: {
        width: 0,
        height: 0
      }
    }
  };
  particlesOptions = {
    background: {
      color: {
        value: '#000'
      }
    },
    fpsLimit: 30,
    interactivity: {
      events: {
        onClick: {
          enable: false,
          mode: 'push'
        },
        onHover: {
          enable: false,
          mode: 'repulse'
        },
        resize: true
      },
      modes: {
        bubble: {
          distance: 400,
          duration: 2,
          opacity: 0.8,
          size: 40
        },
        push: {
          quantity: 4
        },
        repulse: {
          distance: 200,
          duration: 0.4
        }
      }
    },
    particles: {
      color: {
        value: '#ffffff'
      },
      links: {
        color: '#ffffff',
        distance: 150,
        enable: true,
        opacity: 0.5,
        width: 1
      },
      collisions: {
        enable: true
      },
      move: {
        enable: true,
        random: true,
        speed: 1,
        straight: false
      },
      number: {
        density: {
          enable: true,
          value_area: 100
        },
        value: 10
      },
      opacity: {
        value: 0.5
      },
      shape: {
        type: 'circle'
      },
      size: {
        random: true,
        value: 1
      }
    },
    detectRetina: false
  };

  particlesLoaded(container: Container): void {
    console.log(container);
  }

  particlesInit(main: Main): void {
    console.log(main);

    // Starting from 1.19.0 you can add custom presets or shape here, using the current tsParticles instance (main)
  }

  onSubmit(): void {
    const { username, password } = this.form;

    this.authService.login(username, password).subscribe(
      data => {
        this.tokenStorage.saveToken(data.accessToken);
        this.tokenStorage.saveUser(data);
        this.isLoggedIn = true;
        this.roles = this.tokenStorage.getUser().roles;

        const snackBarRef = this.snackBarLogin.open('Logging in, please wait', null, {
          duration: 2000
        });

        snackBarRef.afterDismissed().subscribe(info => {
          this.reloadPage();
        });
      },
      err => {
        this.snackBarLogin.open(err.error.message, null, {
          duration: 2000
        });
      }
    );
  }

  reloadPage(): void {
    window.location.reload();
  }
}
