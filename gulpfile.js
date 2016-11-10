const gulp    = require('gulp');
const isparta = require('isparta');
const plugins = require('gulp-load-plugins')();

function unitTests() {
    return gulp.src(['tests/unit/**/*.js'])
        .pipe(
            plugins.mocha(
                {
                    reporter: 'spec',
                    //compilers: { js: babel },
                }
            )
        );
}

gulp.task(
    'coverage', (done) => {
        gulp.src(['src/**/*.js'])
            .pipe(
                plugins.istanbul(
                    {
                        instrumenter:    isparta.Instrumenter,
                        includeUntested: true,
                    }
                )
            )
            .pipe(plugins.istanbul.hookRequire())
            .on(
                'finish', () => {
                    unitTests()
                        .pipe(plugins.istanbul.writeReports())
                        .pipe(plugins.istanbul.enforceThresholds({ thresholds: { global: 90 } }))
                        .on('end', done);
                }
            );
    }
);

gulp.task(
    'test:unit', () => {
        return unitTests();
    }
);

gulp.task('test', plugins.sequence('coverage', 'test:unit'));
gulp.task('default', plugins.sequence('test'));