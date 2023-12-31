import { FetchImages } from './fetch-images';
import { Notify } from 'notiflix/build/notiflix-notify-aio';
import _throttle from 'lodash.throttle';
import _debounce from 'lodash.debounce';
import SimpleLightbox from 'simplelightbox';
import 'simplelightbox/dist/simple-lightbox.min.css';

const refs = {
  form: document.querySelector('#search-form'),
  gallery: document.querySelector('#gallery'),
  submitBtn: document.querySelector('#submit-btn'),
  loadMoreBtn: document.querySelector('#load-more-btn'),
};

const gallery = new SimpleLightbox('.gallery a');
const getImages = new FetchImages();
const showNotification = {
  success(quantity) {
    Notify.success(`Hooray! We found ${quantity} images.`);
  },
  noMatchingImages() {
    Notify.failure(
      'Sorry, there are no images matching your search query. Please try again.'
    );
  },
  noSearchQuery() {
    Notify.failure('Please input your search query!');
  },
  endOfResults() {
    Notify.failure(
      "We're sorry, but you've reached the end of search results."
    );
  },
};
const buttonStatus = {
  Off(btn) {
    btn.textContent = 'Please wait...';
    btn.disabled = true;
  },

  On(btn) {
    btn.textContent = 'Search';
    btn.disabled = false;
  },
  hide(btn) {
    btn.classList.add('is-hidden');
  },
  show(btn) {
    btn.classList.remove('is-hidden');
  },
};

const makeMarkup = ({ hits }) => {
  return hits
    .map(img => {
      return `<div class="photo-card">
      <a class="photo-link" href="${img.largeImageURL}">
      <img src="${img.webformatURL}" alt="${img.tags}" loading="lazy" />
      <div class="info">
        <p class="info-item">
          <b>Likes</b>
          ${img.likes}
        </p>
        <p class="info-item">
          <b>Views</b>
          ${img.views}
        </p>
        <p class="info-item">
          <b>Comments</b>
          ${img.comments}
        </p>
        <p class="info-item">
          <b>Downloads</b>
          ${img.downloads}
        </p>
      </div>
    </a>
</div>
`;
    })
    .join('');
};
const renderMarkup = imgs => {
  refs.gallery.insertAdjacentHTML('beforeend', makeMarkup(imgs));
  gallery.refresh();
};
const goSearch = async () => {
  const imgs = await getImages.fetch();

  buttonStatus.On(refs.submitBtn);

  if (imgs.totalHits === 0) {
    showNotification.noMatchingImages();
    return;
  }

  showNotification.success(imgs.totalHits);
  renderMarkup(imgs);

  if (imgs.hits.length < 40) {
    getImages.setEndOfResults(true);
    showNotification.endOfResults();

    return;
  }

  window.addEventListener('scroll', infiniteScroll);
};
const loadMore = async () => {
  getImages.incrementPage();

  try {
    const imgs = await getImages.fetch();
    if (imgs.hits.length < 40) {
      getImages.setEndOfResults(true);
      showNotification.endOfResults();
      
    }

    renderMarkup(imgs);
  } catch (error) {
    console.log(error);
  }
};
const scrollPage = () => {
  const { height: cardHeight } = document
    .querySelector('.gallery')
    .firstElementChild.getBoundingClientRect();

  window.scrollBy({
    top: cardHeight * 2,
    behavior: 'smooth',
  });
};
const infiniteScroll = _debounce(() => {
  const cardSize = 250;

  if (
    window.innerHeight + window.pageYOffset + cardSize >
    document.body.offsetHeight
  ) {
    if (getImages.searchParams.endOfResults) {
      window.removeEventListener('scroll', infiniteScroll);
      return;
    }
    loadMore();
    scrollPage();
  }
}, 350);

const handleSearchSubmit = event => {
  event.preventDefault();
  const { searchQuery } = event.target.elements;

  if (searchQuery.value.trim() === '') {
    showNotification.noSearchQuery();
    return;
  }

  refs.gallery.innerHTML = '';
  buttonStatus.Off(refs.submitBtn);
  
  getImages.setQuery(searchQuery.value.trim());
  getImages.setEndOfResults(false);
  getImages.resetPage();
  try {
    goSearch();
  } catch (error) {
    console.log(error);
  }
};

refs.form.addEventListener('submit', handleSearchSubmit);
