# vue-posenet

Basic template for personal use: body pose estimation using posenet in vue.


## Usage

cd to the project, and run `npm install` & `npm run dev`, then open http://localhost:5173

In the browser, wait for the 'loading' word to disappear from the screen, and then click "start capture".

The codebase is not too big, so it should not be hard to figure out how it works. There is some random mumbo-jumbo about analyzing the movement, you can delete most of that.

## Things that need improvement

- The 'start capturing' button should not appear until the posenet model has been loaded and initiated. It often leads to errors and an unintuitive experience for the developer.