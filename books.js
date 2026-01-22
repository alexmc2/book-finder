// Selectors
const form = document.querySelector('.search');
const input = document.querySelector('#search-input');
const results = document.querySelector('#results');
const loadMoreButton = document.querySelector('#load-more');
const statusElement = document.querySelector('#search-status');
const sortSelect = document.querySelector('#sort-select');

const BASE_URL = 'https://openlibrary.org/search.json';
const RESULTS_PER_PAGE = 10;

// prevents user from making multiple requests simultaneously
let isLoading = false;

// remembers what user requested so that the load more button works
let currentQuery = '';

// tracks current page for pagination
let currentPage = 1;

// stores the total number of results from the API
let totalResults = 0;

//creates local copy of everything fetched so far (for sorting)
let allBooks = [];

// UI helpers

// displays the status message to the user
const showSearchStatus = (message) => {
  statusElement.textContent = message;
  // ensure the status element is visible
  statusElement.classList.remove('status--hidden');
};

// hides the status message when not needed
const hideStatus = () => {
  statusElement.classList.add('status--hidden');
};

// this shows the results container
const showResults = () => {
  // this ensures that the results container is visible
  results.classList.remove('results--hidden');
};

// toggles visibility of the results container
const hideResults = () => {
  results.classList.add('results--hidden');
  loadMoreButton.classList.add('pagination__btn--hidden');
};

//sort the books based on the dropdown selection
const sortBooks = (books) => {
  const sortType = sortSelect.value;
  // Creates a copy so that the original array is not mutated
  const sorted = [...books];

  // sort logic
  return sorted.sort((a, b) => {
    if (sortType === 'newest') {
      return (b.first_publish_year || 0) - (a.first_publish_year || 0);
    }
    if (sortType === 'oldest') {
      return (a.first_publish_year || 9999) - (b.first_publish_year || 9999);
    }
    if (sortType === 'a-z') {
      return (a.title || '').localeCompare(b.title || '');
    }
    return 0; // keeps API order, default sort
  });
};

// logic to show or hide the load more button
const showLoadMore = () => {
  loadMoreButton.classList.remove('pagination__btn--hidden');
  loadMoreButton.disabled = false;
};

const hideLoadMore = () => {
  loadMoreButton.classList.add('pagination__btn--hidden');
  loadMoreButton.disabled = true;
};

// updates the visibility of the load more button based on results
const updateLoadMoreVisibility = () => {
  // check is all books have been fetched
  if (allBooks.length >= totalResults || totalResults === 0) {
    hideLoadMore();
  } else {
    showLoadMore();
  }
};

//updates the status message with the number of results
const updateResultsStatus = (count) => {
  const total = totalResults || count;
  const label = total === 1 ? 'result' : 'results';
  showSearchStatus(
    `Showing ${count} of ${total} ${label} for "${currentQuery}".`,
  );
};

//handles sorting/rendering
const updateBooks = () => {
  const sorted = sortBooks(allBooks);

  // clear previous results
  results.innerHTML = '';

  renderBooks(sorted);

  updateResultsStatus(sorted.length);
  showResults();
  updateLoadMoreVisibility();
};

// book card
const booksCard = (book) => {
  const card = document.createElement('article');
  card.className = 'card';

  const bookTitle = book.title || 'Untitled book';
  const authorNames = Array.isArray(book.author_name)
    ? book.author_name.join(', ')
    : 'Unknown author';

  // adds the cover image if it's available
  if (book.cover_i) {
    const img = document.createElement('img');
    img.className = 'card__image';
    img.src = `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`;
    img.alt = `${bookTitle} by ${authorNames}`;
    card.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'card__placeholder';
    placeholder.textContent = bookTitle;
    card.appendChild(placeholder);
  }

  const info = document.createElement('div');
  info.className = 'card__info';

  const titleElement = document.createElement('h3');
  titleElement.className = 'card__title';
  titleElement.textContent = bookTitle;

  const authorElement = document.createElement('p');
  authorElement.className = 'card__author';
  authorElement.textContent = authorNames;

  const yearElement = document.createElement('small');
  yearElement.style.color = '#ddd';
  yearElement.textContent = book.first_publish_year
    ? ` (${book.first_publish_year})`
    : '';

  info.appendChild(titleElement);
  info.appendChild(authorElement);
  info.appendChild(yearElement);
  card.appendChild(info);

  console.log(book);
  return card;
};

// renders the list of books into the results container
const renderBooks = (books) => {
  const fragment = document.createDocumentFragment();
  books.forEach((book) => {
    fragment.appendChild(booksCard(book));
  });
  results.appendChild(fragment);
};

// fetches books from the API
const fetchBooks = async (query, page) => {
  const url = new URL(BASE_URL);

  // sets the query parameters
  url.searchParams.set('q', query);
  url.searchParams.set('limit', RESULTS_PER_PAGE.toString());
  url.searchParams.set('page', page.toString());

  // fields to retrieve from the API
  // url.searchParams.set(
  //   'fields',
  //   'title,author_name,first_publish_year,cover_i',
  // );

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new err('Request failed');
  }

  const data = await response.json();
  const books = Array.isArray(data.docs) ? data.docs : [];
  return { books, total: data.numFound || 0 };
};

statusElement.classList.add('status--hidden');
results.classList.add('results--hidden');
loadMoreButton.classList.add('pagination__btn--hidden');
loadMoreButton.disabled = true;

// event listeners
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const query = input.value.trim();
  if (!query) {
    showSearchStatus('Please enter a search term!');
    hideResults();
    return;
  }

  // prevents user making multiple requests at once
  isLoading = true;
  currentQuery = query;
  currentPage = 1;

  // reset list for a new search
  allBooks = [];

  showSearchStatus('Loading books...');
  hideResults();

  // fetch books from the API
  try {
    const result = await fetchBooks(currentQuery, currentPage);

    // save to master list
    allBooks = result.books;
    totalResults = result.total;

    if (!allBooks.length) {
      showSearchStatus('No results found. Try a different search term!');
      return;
    }

    // sort the books
    updateBooks();
  } catch (err) {
    console.err(err);
    showSearchStatus('Oh no! Something went wrong! Please try again.');
  } finally {
    isLoading = false;
  }
});

// handles the load more button click
loadMoreButton.addEventListener('click', async () => {
  if (isLoading || !currentQuery) {
    return;
  }
  isLoading = true;
  loadMoreButton.disabled = true;
  showSearchStatus('Loading more results...');

  try {
    const nextPage = currentPage + 1;
    const result = await fetchBooks(currentQuery, nextPage);

    allBooks = [...allBooks, ...result.books];
    currentPage = nextPage;

    updateBooks();
  } catch (err) {
    showSearchStatus('Something went wrong!');
  } finally {
    isLoading = false;
  }
});

sortSelect.addEventListener('change', () => {
  updateBooks();
});

input.addEventListener('input', () => {
  if (isLoading) return;
  const query = input.value.trim();
  if (!query) {
    showSearchStatus('Enter a search term to view results.');
    hideResults();
  }
});
